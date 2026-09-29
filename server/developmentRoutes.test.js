import 'dotenv/config'
import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import { randomUUID } from 'node:crypto'
import { unlinkSync } from 'node:fs'
import { getPrisma, closePrisma } from './database/prismaClient.js'
import { issueMobileAuthSession } from './services/mobileAuthSessions.js'
import { registerDevelopmentRoutes } from './developmentRoutes.js'
const enabled = process.env.RUN_DEVELOPMENT_DB_TESTS === '1'
test(
  'authenticated development lifecycle, interests, privacy and analytics',
  { skip: !enabled },
  async () => {
    const db = getPrisma(),
      app = express()
    registerDevelopmentRoutes(app)
    const server = app.listen(0, '127.0.0.1')
    await new Promise((r) => server.once('listening', r))
    const base = `http://127.0.0.1:${server.address().port}/api/development`
    const ids = [],
      projects = [],
      properties = [],
      privateFiles = []
    const makeUser = async (role) => {
      const u = await db.users.create({
        data: {
          first_name: 'Development Test',
          email: `development-test-${randomUUID()}@example.test`,
          role,
          is_verified: 0,
          deposit_amount: 0,
          country: 'Spain',
        },
      })
      ids.push(u.id)
      return { ...u, token: await issueMobileAuthSession(u.id) }
    }
    const req = async (path, user, method = 'GET', body) => {
      const r = await fetch(base + path, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(user ? { Authorization: `Bearer ${user.token}` } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      })
      return { status: r.status, ...(await r.json()) }
    }
    try {
      const seller = await makeUser('seller'),
        buyer = await makeUser('buyer'),
        stranger = await makeUser('seller')
      const input = {
        title: 'Development API test',
        location: 'Tenerife',
        asset_type: 'land',
        photos: ['/images/development/costa-adeje-cover.png'],
        terms: {
          landArea: 620,
          builtArea: 250,
          landCost: 580000,
          constructionCost: 550000,
          otherCosts: 0,
          expectedSale: 2200000,
          requiredCapital: 1130000,
          termMonths: 18,
          preferredReturn: 12,
          platformShare: 20,
        },
      }
      assert.equal(
        (await req('/projects', null, 'POST', { ...input, owner_id: seller.id })).status,
        401,
      )
      assert.equal((await req('/projects', buyer, 'POST', input)).status, 403)
      assert.equal((await req('/projects?mine=1', buyer)).status, 403)
      assert.equal(
        (
          await req('/projects', seller, 'POST', {
            ...input,
            terms: { ...input.terms, platformShare: 200 },
          })
        ).status,
        400,
      )
      const created = await req('/projects', seller, 'POST', input)
      assert.equal(created.status, 201)
      const p = created.data
      projects.push(p.id)
      assert.equal(p.asset_type, 'land')
      assert.equal(p.published, false)
      assert.equal((await req(`/projects/${p.id}`, null)).status, 404)
      assert.equal((await req(`/projects/${p.id}/publish`, stranger, 'POST', {})).status, 404)
      assert.equal((await req(`/projects/${p.id}/publish`, seller, 'POST', {})).status, 200)
      assert.equal((await req(`/projects/${p.id}`, null)).data.funded, 0)
      assert.equal(
        (
          await req(`/projects/${p.id}/stage`, seller, 'POST', {
            stage: 'construction',
            note: 'skip',
          })
        ).status,
        409,
      )
      assert.equal(
        (
          await req(`/projects/${p.id}/stage`, seller, 'POST', {
            stage: 'fundraising',
            note: 'Funding opened',
          })
        ).status,
        200,
      )
      assert.equal(
        (await req(`/projects/${p.id}/interest`, buyer, 'POST', { amount: 10000 })).status,
        400,
      )
      const passport = {
        investor_type: 'individual',
        declared_capital: 300000,
        average_ticket: 10000,
        past_deals: 2,
        payment_method: 'bank',
        readiness: 'ready',
        share_with_sellers: true,
        identityVerified: true,
        verifiedCapital: 999999,
      }
      const saved = await req('/passport', buyer, 'PUT', passport)
      assert.equal(saved.data.identityVerified, false)
      assert.equal(saved.data.verifiedCapital, 0)
      await req(`/events/development:${p.id}`, buyer, 'POST', { kind: 'view' })
      await req(`/events/development:${p.id}`, buyer, 'POST', { kind: 'view' })
      assert.equal((await req(`/projects/${p.id}/interest`, buyer, 'POST', { amount: 10000 })).status, 400)
      assert.equal((await req(`/projects/${p.id}/interest`, buyer, 'POST', { amount: 1130000 })).status, 200)
      assert.equal((await req(`/projects/${p.id}/interest`, buyer, 'POST', { amount: 1130000 })).status, 200)
      const detail = (await req(`/projects/${p.id}`, null)).data
      assert.equal(detail.funded, 0)
      assert.equal(detail.pledged, 1130000)
      assert.equal(detail.interestedBuyers, 1)
      assert.equal((await req(`/projects/${p.id}`, seller, 'PATCH', input)).status, 409)
      assert.equal((await req(`/analytics/development:${p.id}`, buyer)).status, 403)
      const analytics = (await req(`/analytics/development:${p.id}`, seller)).data
      assert.equal(analytics.views, 1)
      assert.equal(analytics.verifiedBuyers, 0)
      assert.equal(analytics.buyers.length, 1)
      assert.equal(analytics.conversion, 100)
      assert.equal(analytics.buyers[0].email, undefined)
      assert.equal(analytics.buyers[0].passport_number, undefined)
      await req('/passport', buyer, 'PUT', { ...passport, share_with_sellers: false })
      assert.equal((await req(`/analytics/development:${p.id}`, seller)).data.buyers.length, 0)
      assert.equal(
        (
          await req(`/projects/${p.id}/stage`, seller, 'POST', {
            stage: 'construction',
            note: 'Start',
          })
        ).status,
        409,
      )
      assert.equal(
        (
          await req(`/projects/${p.id}/funding`, buyer, 'POST', {
            amount: 1130000,
            reference: 'fake',
          })
        ).status,
        403,
      )
      assert.equal(
        (
          await req(`/projects/${p.id}/funding`, seller, 'POST', {
            amount: 500000,
            reference: 'test',
          })
        ).status,
        409,
      )
      assert.equal(
        (
          await req(`/projects/${p.id}/funding`, seller, 'POST', {
            amount: 1130000,
            reference: 'test-receipt',
          })
        ).status,
        200,
      )
      assert.equal((await req(`/projects/${p.id}`, null)).data.fundingPercent, 100)
      assert.equal((await req(`/projects/${p.id}/funding`, seller, 'POST', { amount: 1130000, reference: 'second-investment' })).status, 409)
      assert.equal((await req(`/projects/${p.id}/interest`, buyer, 'POST', { amount: 1130000 })).status, 409)

      for (const stage of ['construction', 'sale', 'returned'])
        assert.equal(
          (
            await req(`/projects/${p.id}/stage`, seller, 'POST', {
              stage,
              note: `Test evidence ${stage}`,
            })
          ).status,
          200,
        )
      assert.equal(
        (await req(`/projects/${p.id}/interest`, buyer, 'POST', { amount: 50 })).status,
        409,
      )
      const source = await db.properties_houses.create({
        data: {
          user_id: seller.id,
          title: 'Test asset journey',
          property_type: 'villa',
          moderation_status: 'approved',
          currency: 'EUR',
          price: 100000,
        },
      })
      properties.push(source.id)
      const profileInput = {
        seller_goal: 'partner',
        current_model: 'distressed',
        reason: 'Test initial review',
        decision: {
          marketPrice: 120000,
          dealPrice: 100000,
          renovation: 10000,
          taxes: 5000,
          annualRent: 12000,
          annualCosts: 2000,
          resale: 150000,
          saleCosts: 5000,
          termMonths: 18,
          targetRoi: 20,
          titleStatus: 'Test only',
        },
        exits: { fixed: 115000, auction: 120000 },
      }
      const path = `/assets/properties_houses/${source.id}`
      assert.equal((await req(path, stranger, 'PUT', profileInput)).status, 403)
      assert.equal((await req(path, seller, 'PUT', profileInput)).status, 200)
      assert.equal(
        (
          await req(path, seller, 'PUT', {
            ...profileInput,
            current_model: 'auction',
            reason: 'Test auction stage',
          })
        ).status,
        200,
      )
      const profile = (await req(path, null)).data.profile
      assert.equal(profile.history.length, 2)
      assert.equal(profile.decision.titleStatus, 'Test only')
      const linked = (
        await req('/projects', seller, 'POST', {
          ...input,
          source_id: source.id,
          source_table: 'properties_houses',
        })
      ).data
      projects.push(linked.id)
      assert.equal((await req(`/projects/${linked.id}/publish`, seller, 'POST', {})).status, 200)
      assert.equal((await req(path, null)).data.profile.current_model, 'development')
      assert.equal((await req(path, null)).data.development.slug, linked.slug)
      assert.equal((await req(`/projects/${linked.id}`, null)).data.assetHistory.length, 3)
      const upload = new FormData()
      upload.append(
        'document',
        new Blob(['%PDF-1.4\nTest only'], { type: 'application/pdf' }),
        'test.pdf',
      )
      upload.append('kind', 'ownership')
      const uploadResponse = await fetch(base + `/projects/${linked.id}/documents`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${seller.token}` },
        body: upload,
      })
      assert.equal(uploadResponse.status, 201)
      const doc = (await uploadResponse.json()).data
      const stored = await db.development_projects.findUnique({ where: { id: linked.id } })
      privateFiles.push(...stored.documents.map((d) => d.file))
      assert.equal((await req(`/projects/${linked.id}`, null)).data.documents[0].file, undefined)
      assert.equal((await req(`/projects/${linked.id}/documents/${doc.id}`, buyer)).status, 403)
      const download = await fetch(base + `/projects/${linked.id}/documents/${doc.id}`, {
        headers: { Authorization: `Bearer ${seller.token}` },
      })
      assert.equal(download.status, 200)
      assert.match(await download.text(), /%PDF/)
      assert.equal((await req('/assets/not_a_table/1', seller)).status, 400)
    } finally {
      await new Promise((r) => server.close(r))
      await db.deal_events.deleteMany({
        where: { asset_key: { in: projects.map((id) => `development:${id}`) } },
      })
      await db.development_interests.deleteMany({ where: { project_id: { in: projects } } })
      await db.development_funding.deleteMany({ where: { project_id: { in: projects } } })
      await db.development_projects.deleteMany({ where: { id: { in: projects } } })
      await db.buyer_passports.deleteMany({ where: { user_id: { in: ids } } })
      await db.mobile_auth_sessions.deleteMany({ where: { user_id: { in: ids } } })
      await db.asset_deal_profiles.deleteMany({ where: { owner_id: { in: ids } } })
      await db.properties_houses.deleteMany({ where: { id: { in: properties } } })
      for (const file of privateFiles)
        unlinkSync(new URL(`./private-development/${file}`, import.meta.url))
      await db.users.deleteMany({ where: { id: { in: ids } } })
      await closePrisma()
    }
  },
)
