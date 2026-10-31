import Stripe from 'stripe'
import { getPrisma } from './database/prismaClient.js'
import { resolvePublicFrontendBase } from './publicFrontendUrl.js'
import {
  investmentPayment,
  investmentShare,
  parseInvestmentAmount,
  toCents,
} from '../src/features/development/investmentMath.js'

const fail = (status, message) => Object.assign(new Error(message), { status })
const stripeClient = () =>
  process.env.STRIPE_SECRET_KEY?.trim()
    ? new Stripe(process.env.STRIPE_SECRET_KEY.trim(), {
        timeout: 15000,
        maxNetworkRetries: 1,
      })
    : null
const uuid = (v) =>
  typeof v === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v,
  )
const investmentResult = (row, status = row.status) => ({
  status,
  investmentId: row.id,
  amount: Number(row.amount),
  currency: row.currency,
})

export function buildDevelopmentPortfolio(rows) {
  const projects = new Map()
  for (const row of rows) {
    const p = row.project
    let item = projects.get(p.id)
    if (!item) {
      item = {
        projectId: p.id,
        slug: p.slug,
        title: p.title,
        location: p.location,
        currency: p.currency,
        stage: p.stage,
        published: p.published,
        imageSrc: Array.isArray(p.photos) ? p.photos[0] || null : null,
        requiredCapital: Number(p.terms.requiredCapital),
        history: (Array.isArray(p.history) ? p.history : []).map(
          ({ stage, at }) => ({ stage, at }),
        ),
        lastPaidAt: row.paid_at,
        investmentCount: 0,
        cents: 0,
      }
      projects.set(p.id, item)
    }
    item.cents += toCents(row.amount)
    item.investmentCount += 1
    if (new Date(row.paid_at) > new Date(item.lastPaidAt))
      item.lastPaidAt = row.paid_at
  }
  return [...projects.values()]
    .map(({ cents, ...item }) => ({
      ...item,
      amount: cents / 100,
      share: investmentShare(cents / 100, item.requiredCapital),
    }))
    .sort((a, b) => new Date(b.lastPaidAt) - new Date(a.lastPaidAt))
}
async function portfolioFor(userId, projectId) {
  const rows = await getPrisma().development_investments.findMany({
    where: {
      user_id: userId,
      status: 'paid',
      ...(projectId ? { project_id: projectId } : {}),
    },
    select: {
      amount: true,
      paid_at: true,
      project: {
        select: {
          id: true,
          slug: true,
          title: true,
          location: true,
          currency: true,
          stage: true,
          published: true,
          photos: true,
          terms: true,
          history: true,
        },
      },
    },
    orderBy: { paid_at: 'desc' },
  })
  return buildDevelopmentPortfolio(rows)
}
async function lockProject(db, id) {
  await db.$queryRaw`SELECT id FROM development_projects WHERE id = ${id} FOR UPDATE`
}
async function lockUser(db, id) {
  await db.$queryRaw`SELECT id FROM users WHERE id = ${id} FOR UPDATE`
}
async function recordPaid(db, row) {
  await db.development_funding.create({
    data: {
      project_id: row.project_id,
      amount: row.amount,
      reference: `investment:${row.id}`,
      recorded_by: row.user_id,
    },
  })
  await db.development_investments.update({
    where: { id: row.id },
    data: { status: 'paid', paid_at: new Date() },
  })
}
async function cancelRow(db, row) {
  if (Number(row.wallet_eur) > 0) {
    await lockUser(db, row.user_id)
    await db.users.update({
      where: { id: row.user_id },
      data: { deposit_amount: { increment: Number(row.wallet_eur) } },
    })
    await db.transactions.create({
      data: {
        user_id: row.user_id,
        type: 'deposit',
        amount: Number(row.wallet_eur),
        description: `Development ${row.project_id}: cancelled investment ${row.id}`,
      },
    })
  }
  await db.development_investments.update({
    where: { id: row.id },
    data: { status: 'cancelled' },
  })
}

// Both the signed webhook and authenticated return path retrieve the session from Stripe.
// Neither browser query parameters nor a webhook body can claim that a payment succeeded.
export async function syncDevelopmentInvestment(
  stripe,
  sessionId,
  { userId, cancel = false } = {},
) {
  const session = await stripe.checkout.sessions.retrieve(sessionId)
  if (session.metadata?.checkout_purpose !== 'development_investment')
    throw fail(400, 'invalidInvestment')
  const id = session.metadata.investment_id
  const original = await getPrisma().development_investments.findUnique({
    where: { id },
  })
  if (
    !original ||
    original.session_id !== session.id ||
    (userId && original.user_id !== userId)
  )
    throw fail(404, 'notFound')
  if (cancel && session.status === 'open') {
    await stripe.checkout.sessions.expire(session.id)
    session.status = 'expired'
  }
  return getPrisma().$transaction(async (db) => {
    await lockProject(db, original.project_id)
    const row = await db.development_investments.findUnique({ where: { id } })
    if (row.status !== 'pending') return investmentResult(row)
    if (session.payment_status === 'paid') {
      if (
        Number(session.metadata.user_id) !== row.user_id ||
        Number(session.metadata.project_id) !== row.project_id ||
        session.mode !== 'payment' ||
        session.currency !== row.currency.toLowerCase() ||
        session.amount_total !== toCents(row.card_amount)
      )
        throw fail(409, 'invalidInvestment')
      await recordPaid(db, row)
      return investmentResult(row, 'paid')
    }
    if (session.status === 'expired') {
      await cancelRow(db, row)
      return investmentResult(row, 'cancelled')
    }
    return investmentResult(row, 'pending')
  })
}
async function syncExpired(projectId, stripe) {
  if (!stripe) return
  const expired = await getPrisma().development_investments.findMany({
    where: {
      project_id: projectId,
      status: 'pending',
      expires_at: { lt: new Date() },
      session_id: { not: null },
    },
    take: 20,
  })
  for (const row of expired)
    await syncDevelopmentInvestment(stripe, row.session_id)
}
export async function projectInvestors(project) {
  const rows = await getPrisma().development_investments.findMany({
    where: { project_id: project.id, status: 'paid' },
    select: {
      user_id: true,
      amount: true,
      user: { select: { country: true } },
    },
    orderBy: { paid_at: 'asc' },
  })
  const grouped = new Map()
  for (const row of rows) {
    const item = grouped.get(row.user_id) || {
      id: row.user_id,
      country: row.user.country || '',
      cents: 0,
    }
    item.cents += toCents(row.amount)
    grouped.set(row.user_id, item)
  }
  return [...grouped.values()].map(({ cents, ...row }) => ({
    ...row,
    amount: cents / 100,
    share: investmentShare(cents / 100, project.terms.requiredCapital),
  }))
}
export function registerInvestmentRoutes(
  router,
  { wrap, userFor, projectFor, getStripe = stripeClient },
) {
  router.get(
    '/portfolio',
    wrap(async (req, res) => {
      const user = await userFor(req)
      res.json({ success: true, data: await portfolioFor(user.id) })
    }),
  )
  router.get(
    '/portfolio/:id',
    wrap(async (req, res) => {
      const user = await userFor(req)
      if (
        !/^\d+$/.test(req.params.id) ||
        !Number.isSafeInteger(Number(req.params.id)) ||
        Number(req.params.id) < 1
      )
        throw fail(400, 'invalidAsset')
      const [item] = await portfolioFor(user.id, Number(req.params.id))
      if (!item) throw fail(404, 'notFound')
      res.json({ success: true, data: item })
    }),
  )
  router.get(
    '/projects/:id/investors',
    wrap(async (req, res) => {
      const project = await projectFor(req.params.id, await userFor(req, false))
      res.json({ success: true, data: await projectInvestors(project) })
    }),
  )
  router.get(
    '/projects/:id/investment-wallet',
    wrap(async (req, res) => {
      const user = await userFor(req)
      const project = await projectFor(req.params.id, user)
      await syncExpired(project.id, getStripe())
      const { convertCurrencyMajor } = await import('./stripeBilling.js')
      const { rate } = await convertCurrencyMajor(1, 'eur', project.currency)
      res.json({
        success: true,
        data: {
          balanceEur: Math.max(0, Number(user.deposit_amount) || 0),
          eurRate: rate,
        },
      })
    }),
  )
  router.post(
    '/projects/:id/invest',
    wrap(async (req, res) => {
      const user = await userFor(req)
      const amount = parseInvestmentAmount(req.body.amount)
      const requestId = req.body.requestId
      if (!amount || !uuid(requestId)) throw fail(400, 'invalidInvestment')
      const project = await projectFor(req.params.id, user)
      const stripe = getStripe()
      await syncExpired(project.id, stripe)
      const rate =
        req.body.useDeposit === true
          ? (
              await (
                await import('./stripeBilling.js')
              ).convertCurrencyMajor(1, 'eur', project.currency)
            ).rate
          : 1
      const result = await getPrisma().$transaction(
        async (db) => {
          await lockProject(db, project.id)
          const existing = await db.development_investments.findUnique({
            where: { id: requestId },
          })
          if (existing) {
            if (
              existing.user_id !== user.id ||
              existing.project_id !== project.id ||
              toCents(existing.amount) !== toCents(amount)
            )
              throw fail(409, 'invalidInvestment')
            if (
              Number(existing.wallet_eur) > 0 !==
                (req.body.useDeposit === true) &&
              Number(existing.wallet_eur) > 0
            )
              throw fail(409, 'invalidInvestment')
            if (existing.status === 'cancelled')
              throw fail(409, 'investmentCancelled')
            if (existing.status === 'paid')
              return investmentResult(existing, 'paid')
            if (!stripe || !existing.session_id)
              throw fail(503, 'paymentUnavailable')
            const session = await stripe.checkout.sessions.retrieve(
              existing.session_id,
            )
            if (session.status !== 'open') throw fail(409, 'paymentPending')
            return {
              status: 'pending',
              investmentId: existing.id,
              url: session.url,
            }
          }
          const p = await projectFor(project.id, user, false, db)
          if (
            p.owner_id === user.id ||
            !p.published ||
            p.stage !== 'fundraising'
          )
            throw fail(409, 'fundraisingClosed')
          const funded = await db.development_funding.aggregate({
            where: { project_id: p.id },
            _sum: { amount: true },
          })
          const pending = await db.development_investments.aggregate({
            where: { project_id: p.id, status: 'pending' },
            _sum: { amount: true },
          })
          const remaining =
            toCents(p.terms.requiredCapital) -
            toCents(funded._sum.amount || 0) -
            toCents(pending._sum.amount || 0)
          if (toCents(amount) > remaining) throw fail(409, 'investmentCapacity')
          await lockUser(db, user.id)
          const current = await db.users.findUnique({ where: { id: user.id } })
          if (!current || current.is_blocked) throw fail(401, 'loginRequired')
          const payment = investmentPayment(
            amount,
            current.deposit_amount,
            req.body.useDeposit === true,
            rate,
          )
          if (
            req.body.expectedPayment &&
            (toCents(req.body.expectedPayment.walletEur) !==
              toCents(payment.walletEur) ||
              toCents(req.body.expectedPayment.cardAmount) !==
                toCents(payment.cardAmount))
          )
            throw fail(409, 'invalidInvestment')
          if (
            payment.cardAmount > 0 &&
            (toCents(payment.cardAmount) < 50 || !stripe)
          )
            throw fail(503, 'paymentUnavailable')
          const expiresAt = new Date(Date.now() + 31 * 60 * 1000)
          const row = await db.development_investments.create({
            data: {
              id: requestId,
              project_id: p.id,
              user_id: user.id,
              amount,
              currency: p.currency,
              wallet_eur: payment.walletEur,
              card_amount: payment.cardAmount,
              expires_at: expiresAt,
            },
          })
          if (payment.walletEur > 0) {
            await db.users.update({
              where: { id: user.id },
              data: { deposit_amount: { decrement: payment.walletEur } },
            })
            await db.transactions.create({
              data: {
                user_id: user.id,
                type: 'withdrawal',
                amount: -payment.walletEur,
                description: `Development ${p.id}: investment ${row.id}`,
              },
            })
          }
          if (!payment.cardAmount) {
            await recordPaid(db, row)
            return investmentResult(row, 'paid')
          }
          const base = resolvePublicFrontendBase(process.env, req)
          const path = `/development/${encodeURIComponent(p.slug)}`
          const session = await stripe.checkout.sessions.create(
            {
              mode: 'payment',
              payment_method_types: ['card'],
              expires_at: Math.floor(expiresAt.getTime() / 1000),
              success_url: `${base}${path}?development_payment=success&session_id={CHECKOUT_SESSION_ID}`,
              cancel_url: `${base}${path}?development_payment=cancel&session_id={CHECKOUT_SESSION_ID}`,
              ...(current.email ? { customer_email: current.email } : {}),
              line_items: [
                {
                  quantity: 1,
                  price_data: {
                    currency: p.currency.toLowerCase(),
                    unit_amount: toCents(payment.cardAmount),
                    product_data: {
                      name: `DEVELOP · ${p.title}`.slice(0, 200),
                    },
                  },
                },
              ],
              metadata: {
                checkout_purpose: 'development_investment',
                investment_id: row.id,
                project_id: String(p.id),
                user_id: String(user.id),
              },
            },
            { idempotencyKey: `development:${row.id}` },
          )
          await db.development_investments.update({
            where: { id: row.id },
            data: { session_id: session.id },
          })
          return { status: 'pending', investmentId: row.id, url: session.url }
        },
        { timeout: 45000 },
      )
      res.json({ success: true, data: result })
    }),
  )
  router.post(
    '/projects/:id/investment-confirm',
    wrap(async (req, res) => {
      const user = await userFor(req)
      const project = await projectFor(req.params.id, user)
      const stripe = getStripe()
      if (!stripe) throw fail(503, 'paymentUnavailable')
      if (
        typeof req.body.sessionId !== 'string' ||
        !/^cs_[a-zA-Z0-9_]{1,220}$/.test(req.body.sessionId)
      )
        throw fail(400, 'invalidInvestment')
      const row = await getPrisma().development_investments.findFirst({
        where: {
          project_id: project.id,
          user_id: user.id,
          session_id: req.body.sessionId,
        },
      })
      if (!row) throw fail(404, 'notFound')
      res.json({
        success: true,
        data: await syncDevelopmentInvestment(stripe, row.session_id, {
          userId: user.id,
          cancel: req.body.cancel === true,
        }),
      })
    }),
  )
}
