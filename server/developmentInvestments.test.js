import 'dotenv/config'
import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import { randomUUID } from 'node:crypto'
import { getPrisma, closePrisma } from './database/prismaClient.js'
import { issueMobileAuthSession } from './services/mobileAuthSessions.js'
import { registerDevelopmentRoutes } from './developmentRoutes.js'
import { syncDevelopmentInvestment } from './developmentInvestments.js'

test(
  'pooled investments: wallet, idempotency, paid-only privacy, card confirmation, cancel and capacity',
  { skip: process.env.RUN_DEVELOPMENT_DB_TESTS !== '1' },
  async () => {
    const db = getPrisma(),
      ids = [],
      projects = [],
      sessions = new Map()
    const stripe = {
      checkout: {
        sessions: {
          async create(input) {
            const id = 'cs_test_' + randomUUID().replaceAll('-', '')
            const row = {
              id,
              status: 'open',
              payment_status: 'unpaid',
              mode: 'payment',
              currency: input.line_items[0].price_data.currency,
              amount_total: input.line_items[0].price_data.unit_amount,
              metadata: input.metadata,
              url: 'https://checkout.stripe.com/test/' + id,
            }
            sessions.set(id, row)
            return row
          },
          async retrieve(id) {
            if (!sessions.has(id)) throw new Error('unknown session')
            return { ...sessions.get(id) }
          },
          async expire(id) {
            sessions.get(id).status = 'expired'
          },
        },
      },
    }
    const app = express()
    registerDevelopmentRoutes(app, { getStripe: () => stripe })
    const server = app.listen(0, '127.0.0.1')
    await new Promise((r) => server.once('listening', r))
    const base = `http://127.0.0.1:${server.address().port}/api/development`
    const request = async (path, user, body) => {
      const r = await fetch(base + path, {
        method: body ? 'POST' : 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(user ? { Authorization: `Bearer ${user.token}` } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      })
      return { status: r.status, ...(await r.json()) }
    }
    const makeUser = async (role, country) => {
      const u = await db.users.create({
        data: {
          role,
          country,
          first_name: 'Investment test',
          email: `investment-${randomUUID()}@example.test`,
          deposit_amount: 1000,
        },
      })
      ids.push(u.id)
      return { ...u, token: await issueMobileAuthSession(u.id) }
    }
    try {
      const owner = await makeUser('seller', 'Spain'),
        buyer = await makeUser('buyer', 'DE'),
        second = await makeUser('buyer', 'PL')
      const p = await db.development_projects.create({
        data: {
          slug: 'investment-test-' + randomUUID(),
          owner_id: owner.id,
          title: 'Investment test',
          location: 'Tenerife',
          stage: 'fundraising',
          published: true,
          photos: [],
          terms: {
            landArea: 200,
            builtArea: 100,
            landCost: 5000,
            constructionCost: 5000,
            otherCosts: 0,
            requiredCapital: 10000,
            expectedSale: 15000,
            preferredReturn: 10,
            platformShare: 20,
            termMonths: 12,
          },
        },
      })
      projects.push(p.id)
      const path = `/projects/${p.id}`,
        id = randomUUID()
      assert.equal(
        (await request(path + '/invest', null, { amount: 100, requestId: id }))
          .status,
        401,
      )
      assert.equal(
        (await request(path + '/invest', owner, { amount: 100, requestId: id }))
          .status,
        409,
      )
      assert.equal(
        (await request(path + '/invest', buyer, { amount: -1, requestId: id }))
          .status,
        400,
      )
      const paid = await request(path + '/invest', buyer, {
        amount: 100,
        useDeposit: true,
        requestId: id,
      })
      assert.equal(paid.status, 200, JSON.stringify(paid))
      assert.equal(paid.data.status, 'paid')
      assert.equal(paid.data.amount, 100)
      assert.equal(paid.data.currency, 'EUR')
      assert.equal(
        (
          await request(path + '/invest', buyer, {
            amount: 100,
            useDeposit: true,
            requestId: id,
          })
        ).data.status,
        'paid',
      )
      assert.equal(
        (await db.users.findUnique({ where: { id: buyer.id } })).deposit_amount,
        900,
      )
      assert.equal(
        (await db.development_funding.findMany({ where: { project_id: p.id } }))
          .length,
        1,
      )
      const investors = (await request(path + '/investors')).data
      assert.deepEqual(Object.keys(investors[0]).sort(), [
        'amount',
        'country',
        'id',
        'share',
      ])
      assert.equal(investors[0].id, buyer.id)
      assert.equal(investors[0].country, 'DE')
      assert.equal(investors[0].share, 1)
      const card = await request(path + '/invest', second, {
        amount: 2000,
        useDeposit: true,
        requestId: randomUUID(),
      })
      assert.equal(card.status, 200, JSON.stringify(card))
      const [cardId] = [...sessions.keys()]
      assert.equal(sessions.get(cardId).amount_total, 100000)
      assert.equal((await request(path + '/investors')).data.length, 1)
      assert.equal(
        (
          await request(path + '/investment-confirm', buyer, {
            sessionId: cardId,
          })
        ).status,
        404,
      )
      sessions.get(cardId).payment_status = 'paid'
      sessions.get(cardId).status = 'complete'
      sessions.get(cardId).amount_total += 1
      await assert.rejects(
        syncDevelopmentInvestment(stripe, cardId),
        /invalidInvestment/,
      )
      sessions.get(cardId).amount_total -= 1
      assert.equal(
        (
          await request(path + '/investment-confirm', second, {
            sessionId: cardId,
          })
        ).data.status,
        'paid',
      )
      await Promise.all([
        syncDevelopmentInvestment(stripe, cardId),
        syncDevelopmentInvestment(stripe, cardId),
      ])
      assert.equal((await request(path)).data.funded, 2100)
      assert.equal((await request(path + '/investors')).data.length, 2)
      const cancel = await request(path + '/invest', buyer, {
        amount: 1200,
        useDeposit: true,
        requestId: randomUUID(),
      })
      assert.equal(cancel.status, 200)
      const cancelId = [...sessions.keys()].at(-1)
      assert.equal(
        (await db.users.findUnique({ where: { id: buyer.id } })).deposit_amount,
        0,
      )
      assert.equal(
        (
          await request(path + '/investment-confirm', buyer, {
            sessionId: cancelId,
            cancel: true,
          })
        ).data.status,
        'cancelled',
      )
      await syncDevelopmentInvestment(stripe, cancelId)
      assert.equal(
        (await db.users.findUnique({ where: { id: buyer.id } })).deposit_amount,
        900,
      )
      const attempts = await Promise.all(
        [buyer, second].map((user) =>
          request(path + '/invest', user, {
            amount: 5000,
            requestId: randomUUID(),
          }),
        ),
      )
      assert.deepEqual(attempts.map((r) => r.status).sort(), [200, 409])
      assert.equal(
        (
          await request(path + '/funding', owner, {
            amount: 3000,
            reference: 'must-not-overfund',
          })
        ).status,
        409,
      )
      const walletRace = await Promise.all(
        [1, 2].map(() =>
          request(path + '/invest', buyer, {
            amount: 900,
            useDeposit: true,
            requestId: randomUUID(),
          }),
        ),
      )
      assert.deepEqual(
        walletRace.map((r) => r.status),
        [200, 200],
      )
      assert.equal(
        (await db.users.findUnique({ where: { id: buyer.id } })).deposit_amount,
        0,
      )
      assert.equal((await request(path)).data.funded, 3000)
      assert.equal((await request(path + '/investors')).data.length, 2)
      assert.equal((await request('/portfolio')).status, 401)
      assert.equal((await request(`/portfolio/${p.id}`, owner)).status, 404)
      const portfolio = await request('/portfolio', buyer)
      assert.equal(portfolio.status, 200)
      assert.equal(portfolio.data.length, 1)
      assert.equal(portfolio.data[0].projectId, p.id)
      assert.equal(portfolio.data[0].amount, 1000)
      assert.equal(portfolio.data[0].investmentCount, 2)
      assert.equal(portfolio.data[0].share, 10)
      assert.equal(portfolio.data[0].stage, 'fundraising')
      assert.equal(portfolio.data[0].owner_id, undefined)
      assert.equal(portfolio.data[0].user_id, undefined)
      assert.equal(portfolio.data[0].session_id, undefined)
      assert.equal((await request(path + '/stage', buyer, { stage: 'construction', note: 'forged change' })).status, 403)
      for (const [sessionId, session] of sessions) {
        if (session.status === 'open') await request(path + '/investment-confirm', Number(session.metadata.user_id) === buyer.id ? buyer : second, { sessionId, cancel: true })
      }
      assert.equal((await request(path + '/funding', owner, { amount: 7000, reference: 'external-complete-test' })).status, 200)
      assert.equal((await request(path + '/stage', owner, { stage: 'construction', note: 'Owner evidence for test construction' })).status, 200)
      const refreshed = await request(`/portfolio/${p.id}`, buyer)
      assert.equal(refreshed.data.stage, 'construction')
      assert.equal(refreshed.data.amount, 1000)
      assert.deepEqual(Object.keys(refreshed.data.history.at(-1)).sort(), ['at', 'stage'])
    } finally {
      await new Promise((r) => server.close(r))
      await db.development_investments.deleteMany({
        where: { project_id: { in: projects } },
      })
      await db.development_funding.deleteMany({
        where: { project_id: { in: projects } },
      })
      await db.development_projects.deleteMany({
        where: { id: { in: projects } },
      })
      await db.transactions.deleteMany({ where: { user_id: { in: ids } } })
      await db.mobile_auth_sessions.deleteMany({
        where: { user_id: { in: ids } },
      })
      await db.users.deleteMany({ where: { id: { in: ids } } })
      await closePrisma()
    }
  },
)
