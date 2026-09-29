import express from 'express'
import multer from 'multer'
import { mkdirSync, unlinkSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { getPrisma } from './database/prismaClient.js'
import { authenticateMobileRequest } from './services/mobileAuthSessions.js'
import {
  DEVELOPMENT_STAGES,
  DEVELOPMENT_FIELDS,
  DEAL_MODELS,
  SELLER_GOALS,
  validateDevelopment,
  calculateWaterfall,
  fundingPercent,
} from '../src/utils/developmentFinance.js'

const PRIVATE_DOCS = fileURLToPath(new URL('./private-development/', import.meta.url))
const TABLES = ['properties', 'properties_apartments', 'properties_houses']
const fail = (status, message) => Object.assign(new Error(message), { status })
const integer = (v) =>
  /^\d+$/.test(String(v)) && Number(v) > 0 && Number.isSafeInteger(Number(v)) ? Number(v) : null
const money = (v) =>
  v !== '' && v != null && Number.isFinite(Number(v)) && Number(v) > 0 && Number(v) <= 1e10
    ? Math.round(Number(v) * 100) / 100
    : null
const text = (v, max = 2000) =>
  String(v ?? '')
    .trim()
    .slice(0, max)
const wrap = (fn) => async (req, res) => {
  try {
    await fn(req, res)
  } catch (e) {
    if (!e.status) console.error('[development]', e)
    res
      .status(e.status || 500)
      .json({ success: false, error: e.status ? e.message : 'serverError' })
  }
}

async function userFor(req, required = true) {
  const session = await authenticateMobileRequest(req)
  const user = session
    ? await getPrisma().users.findUnique({ where: { id: session.userId } })
    : null
  if ((!user || user.is_blocked) && required) throw fail(401, 'loginRequired')
  return user?.is_blocked ? null : user
}
async function projectFor(id, user, owner = false, db = getPrisma()) {
  const p = await db.development_projects.findFirst({
    where: integer(id) ? { id: Number(id) } : { slug: String(id) },
  })
  if (!p || (!p.published && p.owner_id !== user?.id)) throw fail(404, 'notFound')
  if (owner && p.owner_id !== user?.id) throw fail(403, 'forbidden')
  if (owner && !['seller', 'owner'].includes(user?.role)) throw fail(403, 'sellerRequired')
  return p
}
async function propertyFor(table, id) {
  if (!TABLES.includes(table) || !integer(id)) throw fail(400, 'invalidAsset')
  const p = await getPrisma()[table].findUnique({ where: { id: Number(id) } })
  if (!p) throw fail(404, 'notFound')
  return p
}
async function summarizeProject(p, db = getPrisma()) {
  const funding = await db.development_funding.aggregate({
    where: { project_id: p.id },
    _sum: { amount: true },
  })
  const interest = await db.development_interests.aggregate({
    where: { project_id: p.id },
    _sum: { amount: true },
    _count: true,
  })
  const funded = Number(funding._sum.amount || 0)
  const assetProfile =
    p.source_id && TABLES.includes(p.source_table)
      ? await db.asset_deal_profiles.findUnique({
          where: {
            property_table_property_id: {
              property_table: p.source_table,
              property_id: p.source_id,
            },
          },
        })
      : null
  return {
    ...p,
    assetHistory: assetProfile?.history || [],
    documents: (p.documents || []).map(({ file, ...d }) => d),
    funded,
    pledged: Number(interest._sum.amount || 0),
    interestedBuyers: interest._count,
    fundingPercent: fundingPercent(funded, p.terms.requiredCapital),
    economics: calculateWaterfall(p.terms),
  }
}
function cleanProject(body) {
  const terms = Object.fromEntries(DEVELOPMENT_FIELDS.map((k) => [k, Number(body.terms?.[k])]))
  if (Object.keys(validateDevelopment(body.terms)).length) throw fail(400, 'invalidTerms')
  terms.assumptions = text(body.terms.assumptions)
  terms.license = text(body.terms.license, 500)
  terms.sellerGoal = SELLER_GOALS.includes(body.sellerGoal) ? body.sellerGoal : 'partner'
  if (!text(body.title) || !text(body.location)) throw fail(400, 'requiredFields')
  if (!['EUR', 'USD', 'GBP'].includes(body.currency || 'EUR')) throw fail(400, 'invalidCurrency')
  const photos = Array.isArray(body.photos)
    ? body.photos
        .filter(
          (p) =>
            typeof p === 'string' &&
            (/^\/images\//.test(p) || /^\/uploads\//.test(p) || /^https:\/\//.test(p)),
        )
        .slice(0, 30)
    : []
  return {
    title: text(body.title, 200),
    description: text(body.description, 10000),
    location: text(body.location, 300),
    asset_type: ['land', 'villa', 'house', 'apartment', 'commercial'].includes(body.asset_type)
      ? body.asset_type
      : 'land',
    currency: body.currency || 'EUR',
    photos,
    terms,
  }
}
function passportView(user, passport) {
  return {
    ...passport,
    user_id: user.id,
    name: [user.first_name, user.last_name].filter(Boolean).join(' '),
    country: user.country,
    identityVerified: user.is_verified === 1,
    verifiedCapital: Math.max(0, Number(user.deposit_amount || 0)),
    verifiedCurrency: 'EUR',
  }
}
export function registerDevelopmentRoutes(app) {
  const router = express.Router()
  router.use(express.json({ limit: '256kb' }))
  router.get(
    '/projects',
    wrap(async (req, res) => {
      const user = req.query.mine === '1' ? await userFor(req) : null
      if (user && !['seller', 'owner'].includes(user.role)) throw fail(403, 'sellerRequired')
      const rows = await getPrisma().development_projects.findMany({
        where: user ? { owner_id: user.id } : { published: true },
        orderBy: { created_at: 'desc' },
        take: 100,
      })
      res.json({ success: true, data: await Promise.all(rows.map((p) => summarizeProject(p))) })
    }),
  )
  router.get(
    '/projects/:id',
    wrap(async (req, res) => {
      const user = await userFor(req, false)
      res.json({
        success: true,
        data: await summarizeProject(await projectFor(req.params.id, user)),
      })
    }),
  )
  router.post(
    '/projects/:id/documents',
    wrap(async (req, res) => {
      const user = await userFor(req),
        p = await projectFor(req.params.id, user, true)
      if ((p.documents || []).length >= 20) throw fail(400, 'requiredFields')
      mkdirSync(PRIVATE_DOCS, { recursive: true })
      const upload = multer({
        dest: PRIVATE_DOCS,
        limits: { fileSize: 15 * 1024 * 1024, files: 1 },
        fileFilter: (_req, file, cb) =>
          cb(null, ['application/pdf', 'image/jpeg', 'image/png'].includes(file.mimetype)),
      }).single('document')
      await new Promise((resolve, reject) =>
        upload(req, res, (err) => (err ? reject(fail(400, 'invalidDocument')) : resolve())),
      )
      if (!req.file) throw fail(400, 'invalidDocument')
      const doc = {
        id: randomUUID(),
        name: text(req.file.originalname, 160),
        mime: req.file.mimetype,
        file: req.file.filename,
        kind: text(req.body.kind, 40),
      }
      try {
        await getPrisma().development_projects.update({
          where: { id: p.id },
          data: { documents: [...(p.documents || []), doc] },
        })
      } catch (e) {
        unlinkSync(req.file.path)
        throw e
      }
      res.status(201).json({ success: true, data: { id: doc.id, name: doc.name } })
    }),
  )
  router.get(
    '/projects/:id/documents/:doc',
    wrap(async (req, res) => {
      const user = await userFor(req),
        p = await projectFor(req.params.id, user)
      if (p.owner_id !== user.id && !(user.is_verified === 1 && Number(user.deposit_amount) > 0))
        throw fail(403, 'documentAccess')
      const doc = (p.documents || []).find((d) => d.id === req.params.doc)
      if (!doc) throw fail(404, 'notFound')
      res.setHeader('X-Content-Type-Options', 'nosniff')
      res.download(join(PRIVATE_DOCS, doc.file), doc.name)
    }),
  )
  router.post(
    '/projects',
    wrap(async (req, res) => {
      const user = await userFor(req)
      if (!['seller', 'owner'].includes(user.role)) throw fail(403, 'sellerRequired')
      const data = cleanProject(req.body)
      let source = {}
      if (req.body.source_id) {
        const p = await propertyFor(req.body.source_table, req.body.source_id)
        if (p.user_id !== user.id) throw fail(403, 'forbidden')
        source = { source_id: p.id, source_table: req.body.source_table }
      }
      const p = await getPrisma().development_projects.create({
        data: {
          ...data,
          ...source,
          owner_id: user.id,
          slug: `develop-${randomUUID()}`,
          published: false,
          history: [{ stage: 'land', at: new Date().toISOString(), actor: user.id }],
        },
      })
      res.status(201).json({ success: true, data: p })
    }),
  )
  router.patch(
    '/projects/:id',
    wrap(async (req, res) => {
      const user = await userFor(req),
        data = cleanProject(req.body)
      if (!integer(req.params.id)) throw fail(400, 'invalidAsset')
      const result = await getPrisma().$transaction(async (db) => {
        await db.$queryRaw`SELECT id FROM development_projects WHERE id = ${Number(req.params.id)} FOR UPDATE`
        const p = await projectFor(req.params.id, user, true, db)
        const count = await db.development_interests.count({ where: { project_id: p.id } })
        const funding = await db.development_funding.count({ where: { project_id: p.id } })
        if (count || funding) throw fail(409, 'termsLocked')
        return db.development_projects.update({
          where: { id: p.id },
          data: { ...data, updated_at: new Date() },
        })
      })
      res.json({ success: true, data: await summarizeProject(result) })
    }),
  )
  router.post(
    '/projects/:id/publish',
    wrap(async (req, res) => {
      const user = await userFor(req)
      if (!integer(req.params.id)) throw fail(400, 'invalidAsset')
      const result = await getPrisma().$transaction(async (db) => {
        await db.$queryRaw`SELECT id FROM development_projects WHERE id = ${Number(req.params.id)} FOR UPDATE`
        const p = await projectFor(req.params.id, user, true, db)
        if (!p.photos.length || Object.keys(validateDevelopment(p.terms)).length)
          throw fail(400, 'requiredFields')
        if (!p.published && p.source_id && TABLES.includes(p.source_table)) {
          const source = await db[p.source_table].findUnique({ where: { id: p.source_id } })
          if (!source || source.user_id !== user.id) throw fail(403, 'forbidden')
          await db.$queryRawUnsafe(
            `SELECT id FROM "${p.source_table}" WHERE id = $1 FOR UPDATE`,
            p.source_id,
          )
          const key = { property_table: p.source_table, property_id: p.source_id }
          const profile = await db.asset_deal_profiles.findUnique({
            where: { property_table_property_id: key },
          })
          const history = [
            ...(profile?.history || []),
            {
              model: 'development',
              previous: profile?.current_model || null,
              at: new Date().toISOString(),
              reason: p.title,
              projectId: p.id,
            },
          ]
          await db.asset_deal_profiles.upsert({
            where: { property_table_property_id: key },
            create: {
              ...key,
              owner_id: user.id,
              current_model: 'development',
              seller_goal: 'partner',
              history,
            },
            update: { current_model: 'development', history, updated_at: new Date() },
          })
        }
        return db.development_projects.update({
          where: { id: p.id },
          data: { published: true, updated_at: new Date() },
        })
      })
      res.json({ success: true, data: await summarizeProject(result) })
    }),
  )
  router.post(
    '/projects/:id/stage',
    wrap(async (req, res) => {
      const user = await userFor(req)
      const result = await getPrisma().$transaction(async (db) => {
        await db.$queryRaw`SELECT id FROM development_projects WHERE id = ${Number(req.params.id)} FOR UPDATE`
        const p = await projectFor(req.params.id, user, true, db)
        const next = DEVELOPMENT_STAGES[DEVELOPMENT_STAGES.indexOf(p.stage) + 1]
        if (req.body.stage !== next) throw fail(409, 'invalidTransition')
        const summary = await summarizeProject(p, db)
        if (next === 'construction' && summary.funded < Number(p.terms.requiredCapital))
          throw fail(409, 'fundingIncomplete')
        const note = text(req.body.note)
        if (!note) throw fail(400, 'evidenceRequired')
        return db.development_projects.update({
          where: { id: p.id },
          data: {
            stage: next,
            history: [
              ...p.history,
              { stage: next, at: new Date().toISOString(), actor: user.id, note },
            ],
            updated_at: new Date(),
          },
        })
      })
      res.json({ success: true, data: await summarizeProject(result) })
    }),
  )
  router.post(
    '/projects/:id/funding',
    wrap(async (req, res) => {
      const user = await userFor(req)
      const amount = money(req.body.amount),
        reference = text(req.body.reference, 200)
      if (!amount || !reference) throw fail(400, 'evidenceRequired')
      await getPrisma().$transaction(async (db) => {
        await db.$queryRaw`SELECT id FROM development_projects WHERE id = ${Number(req.params.id)} FOR UPDATE`
        const p = await projectFor(req.params.id, user, true, db)
        if (p.stage !== 'fundraising') throw fail(409, 'fundraisingClosed')
        const summary = await summarizeProject(p, db)
        if (summary.funded > 0) throw fail(409, 'fundraisingClosed')
        if (amount !== money(p.terms.requiredCapital))
          throw fail(409, 'fullInvestmentRequired')
        if (
          await db.development_funding.findUnique({
            where: { project_id_reference: { project_id: p.id, reference } },
          })
        )
          throw fail(409, 'duplicateReference')
        await db.development_funding.create({
          data: { project_id: p.id, amount, reference, recorded_by: user.id },
        })
      })
      res.json({ success: true })
    }),
  )
  router.post(
    '/projects/:id/interest',
    wrap(async (req, res) => {
      const user = await userFor(req)
      if (!integer(req.params.id)) throw fail(400, 'invalidAsset')
      await getPrisma().$transaction(async (db) => {
        await db.$queryRaw`SELECT id FROM development_projects WHERE id = ${Number(req.params.id)} FOR UPDATE`
        const p = await projectFor(req.params.id, user, false, db)
        if (p.owner_id === user.id || !p.published || p.stage !== 'fundraising')
          throw fail(409, 'fundraisingClosed')
        if (await db.development_funding.count({ where: { project_id: p.id } }))
          throw fail(409, 'fundraisingClosed')
        const passport = await db.buyer_passports.findUnique({ where: { user_id: user.id } })
        if (!passport?.share_with_sellers) throw fail(400, 'passportRequired')
        const amount = money(req.body.amount)
        if (amount !== money(p.terms.requiredCapital)) throw fail(400, 'fullInvestmentRequired')
        await db.development_interests.upsert({
          where: { project_id_user_id: { project_id: p.id, user_id: user.id } },
          create: { project_id: p.id, user_id: user.id, amount },
          update: { amount },
        })
      })
      res.json({ success: true })
    }),
  )
  router.get(
    '/passport',
    wrap(async (req, res) => {
      const user = await userFor(req)
      res.json({
        success: true,
        data: passportView(
          user,
          await getPrisma().buyer_passports.findUnique({ where: { user_id: user.id } }),
        ),
      })
    }),
  )
  router.put(
    '/passport',
    wrap(async (req, res) => {
      const user = await userFor(req),
        b = req.body
      if (
        !['individual', 'professional', 'fund', 'developer'].includes(b.investor_type) ||
        !['bank', 'mortgage', 'mixed'].includes(b.payment_method) ||
        !['exploring', 'ready', 'reserved'].includes(b.readiness)
      )
        throw fail(400, 'invalidPassport')
      for (const k of ['declared_capital', 'average_ticket', 'past_deals'])
        if (!Number.isFinite(Number(b[k])) || Number(b[k]) < 0 || Number(b[k]) > 1e10)
          throw fail(400, 'invalidNumber')
      if (!Number.isInteger(Number(b.past_deals)) || Number(b.past_deals) > 100000)
        throw fail(400, 'invalidNumber')
      const data = {
        investor_type: b.investor_type,
        payment_method: b.payment_method,
        readiness: b.readiness,
        declared_capital: Number(b.declared_capital),
        average_ticket: Number(b.average_ticket),
        past_deals: Number(b.past_deals),
        share_with_sellers: b.share_with_sellers === true,
        updated_at: new Date(),
      }
      const passport = await getPrisma().buyer_passports.upsert({
        where: { user_id: user.id },
        create: { user_id: user.id, ...data },
        update: data,
      })
      res.json({ success: true, data: passportView(user, passport) })
    }),
  )
  router.get(
    '/assets/:table/:id',
    wrap(async (req, res) => {
      const p = await propertyFor(req.params.table, req.params.id)
      const user = await userFor(req, false)
      if (p.moderation_status !== 'approved' && p.user_id !== user?.id) throw fail(404, 'notFound')
      let profile = await getPrisma().asset_deal_profiles.findUnique({
        where: {
          property_table_property_id: { property_table: req.params.table, property_id: p.id },
        },
      })
      let parameters = {}
      try {
        parameters = JSON.parse(p.tz_parameters_json || '{}')
      } catch {}
      if (!profile)
        profile = {
          seller_goal: SELLER_GOALS.includes(parameters.seller_goal)
            ? parameters.seller_goal
            : 'maximum',
          current_model: p.is_shared_ownership
            ? 'shares'
            : p.is_debt
              ? 'distressed'
              : p.is_auction
                ? 'auction'
                : 'fixed',
          decision: { ...(p.price != null ? { dealPrice: p.price } : {}) },
          exits: {},
          history: [],
        }
      const development = await getPrisma().development_projects.findFirst({
        where: { source_table: req.params.table, source_id: p.id, published: true },
        select: { slug: true },
      })
      res.json({
        success: true,
        data: { profile, development, owner_id: p.user_id, currency: p.currency },
      })
    }),
  )
  router.put(
    '/assets/:table/:id',
    wrap(async (req, res) => {
      const user = await userFor(req),
        p = await propertyFor(req.params.table, req.params.id),
        b = req.body
      if (p.user_id !== user.id) throw fail(403, 'forbidden')
      if (!SELLER_GOALS.includes(b.seller_goal) || !DEAL_MODELS.includes(b.current_model))
        throw fail(400, 'invalidModel')
      const decision = {},
        exits = {}
      for (const k of [
        'marketPrice',
        'dealPrice',
        'renovation',
        'taxes',
        'annualRent',
        'annualCosts',
        'resale',
        'saleCosts',
        'termMonths',
        'targetRoi',
      ]) {
        if (b.decision?.[k] == null || b.decision[k] === '') continue
        const v = Number(b.decision[k])
        if (!Number.isFinite(v) || v < 0 || v > 1e10 || (k === 'termMonths' && v > 600))
          throw fail(400, 'invalidNumber')
        decision[k] = v
      }
      for (const k of ['legalRisks', 'titleStatus', 'occupancy', 'zoning', 'comparables'])
        decision[k] = text(b.decision?.[k])
      for (const k of DEAL_MODELS) {
        if (b.exits?.[k] == null || b.exits[k] === '') continue
        const v = money(b.exits[k])
        if (!v) throw fail(400, 'invalidNumber')
        exits[k] = v
      }
      const key = { property_table: req.params.table, property_id: p.id }
      const profile = await getPrisma().$transaction(async (db) => {
        // Table names are restricted by propertyFor; the id remains parameterized.
        await db.$queryRawUnsafe(
          `SELECT id FROM "${req.params.table}" WHERE id = $1 FOR UPDATE`,
          p.id,
        )
        const previous = await db.asset_deal_profiles.findUnique({
          where: { property_table_property_id: key },
        })
        const history = previous?.history || []
        if (previous?.current_model !== b.current_model) {
          if (!text(b.reason)) throw fail(400, 'evidenceRequired')
          history.push({
            model: b.current_model,
            previous: previous?.current_model || null,
            at: new Date().toISOString(),
            reason: text(b.reason),
          })
        }
        const data = {
          seller_goal: b.seller_goal,
          current_model: b.current_model,
          decision,
          exits,
          history,
          updated_at: new Date(),
        }
        return db.asset_deal_profiles.upsert({
          where: { property_table_property_id: key },
          create: { ...key, owner_id: user.id, ...data },
          update: data,
        })
      })
      res.json({ success: true, data: profile })
    }),
  )
  async function eventAsset(req, user, owner = false) {
    const key = text(req.params.key, 100)
    const [table, id] = key.split(':')
    const p =
      table === 'development' ? await projectFor(id, user, owner) : await propertyFor(table, id)
    if (owner && (p.owner_id ?? p.user_id) !== user?.id) throw fail(403, 'forbidden')
    if (
      !owner &&
      table !== 'development' &&
      p.moderation_status !== 'approved' &&
      p.user_id !== user?.id
    )
      throw fail(404, 'notFound')
    return { key, p, table }
  }
  router.post(
    '/events/:key',
    wrap(async (req, res) => {
      const user = await userFor(req, false)
      const { key, p } = await eventAsset(req, user)
      if (user?.id === (p.owner_id ?? p.user_id)) return res.json({ success: true })
      const kind = req.body.kind === 'offer' ? 'offer' : 'view'
      if (kind === 'offer' && !user) throw fail(401, 'loginRequired')
      if (kind === 'offer' && !money(req.body.amount)) throw fail(400, 'invalidNumber')
      const visitor = user ? `user:${user.id}` : text(req.body.visitor_id, 100)
      if (!visitor) throw fail(400, 'requiredFields')
      const recent = await getPrisma().deal_events.findFirst({
        where: {
          asset_key: key,
          visitor_id: visitor,
          kind,
          created_at: { gte: new Date(Date.now() - (kind === 'view' ? 1800000 : 60000)) },
        },
      })
      if (!recent)
        await getPrisma().deal_events.create({
          data: {
            asset_key: key,
            visitor_id: visitor,
            user_id: user?.id,
            kind,
            amount: kind === 'offer' ? money(req.body.amount) : null,
            country: user?.country || null,
          },
        })
      res.json({ success: true })
    }),
  )
  router.get(
    '/analytics/:key',
    wrap(async (req, res) => {
      const user = await userFor(req),
        { key, p, table } = await eventAsset(req, user, true),
        db = getPrisma()
      const events = await db.deal_events.findMany({
        where: { asset_key: key },
        orderBy: { created_at: 'desc' },
        take: 10000,
      })
      const interests =
        table === 'development'
          ? await db.development_interests.findMany({ where: { project_id: p.id } })
          : []
      const bids =
        table === 'development'
          ? []
          : await db.bids.findMany({ where: { property_id: p.id, property_table: table } })
      const ids = [
        ...new Set(
          [
            ...events.map((e) => e.user_id),
            ...interests.map((e) => e.user_id),
            ...bids.map((e) => e.user_id),
          ].filter(Boolean),
        ),
      ]
      const passports = await db.buyer_passports.findMany({
        where: { user_id: { in: ids }, share_with_sellers: true },
      })
      const users = await db.users.findMany({
        where: { id: { in: passports.map((p) => p.user_id) } },
      })
      const buyers = users.map((u) => ({
        ...passportView(
          u,
          passports.find((p) => p.user_id === u.id),
        ),
        proposedInvestment: interests.find((i) => i.user_id === u.id)?.amount ?? null,
        highestBid: bids.some((b) => b.user_id === u.id)
          ? Math.max(...bids.filter((b) => b.user_id === u.id).map((b) => b.bid_amount))
          : null,
        latestOffer: events.find((e) => e.user_id === u.id && e.kind === 'offer')?.amount ?? null,
      }))
      const offers = events.filter((e) => e.kind === 'offer'),
        prices = [...offers.map((e) => Number(e.amount)), ...bids.map((b) => b.bid_amount)]
      const visitors = new Set(events.filter((e) => e.kind === 'view').map((e) => e.visitor_id))
      const responders = new Set([
        ...offers.map((e) => e.user_id),
        ...bids.map((b) => b.user_id),
        ...interests.map((i) => i.user_id),
      ])
      const convertedVisitors = [...responders].filter((id) => visitors.has(`user:${id}`)).length
      const geography = {}
      for (const e of events.filter((e) => e.kind === 'view'))
        geography[e.country || 'unknown'] = (geography[e.country || 'unknown'] || 0) + 1
      const average = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : null
      res.json({
        success: true,
        data: {
          currency: p.currency,
          asOf: new Date().toISOString(),
          views: events.filter((e) => e.kind === 'view').length,
          uniqueVisitors: visitors.size,
          geography,
          buyers,
          verifiedBuyers: buyers.filter((b) => b.identityVerified && b.verifiedCapital > 0).length,
          bidders: new Set(bids.map((b) => b.user_id)).size,
          offers: offers.length,
          offersList: offers.map((e) => ({
            id: e.id,
            amount: Number(e.amount),
            at: e.created_at,
            name: buyers.find((b) => b.user_id === e.user_id)?.name || null,
          })),
          interests: interests.length,
          average,
          maximum: prices.length ? Math.max(...prices) : null,
          conversion: visitors.size ? (convertedVisitors / visitors.size) * 100 : 0,
          forecast:
            prices.length >= 3
              ? { low: Math.min(...prices), high: Math.max(...prices), sample: prices.length }
              : null,
          truncated: events.length === 10000,
        },
      })
    }),
  )
  app.use('/api/development', router)
}
