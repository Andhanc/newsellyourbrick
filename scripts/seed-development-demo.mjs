#!/usr/bin/env node
import 'dotenv/config'
import { createHash, randomBytes } from 'node:crypto'
import { mkdirSync, writeFileSync, copyFileSync, existsSync } from 'node:fs'
import { getPrisma, closePrisma } from '../server/database/prismaClient.js'
const prisma = getPrisma()
const slug = 'callao-salvaje-costa-adeje-demo'
try {
  let seller = await prisma.users.findFirst({
    where: { email: 'development-demo@sellyourbrick.test', role: 'seller' },
  })
  if (!seller) {
    const password = randomBytes(18).toString('base64url')
    seller = await prisma.users.create({
      data: {
        email: 'development-demo@sellyourbrick.test',
        role: 'seller',
        first_name: 'Development',
        last_name: 'Demo',
        country: 'Spain',
        is_verified: 0,
        password: createHash('sha256').update(password).digest('hex'),
      },
    })
    mkdirSync('output/development', { recursive: true })
    writeFileSync(
      'output/development/demo-access.json',
      JSON.stringify(
        {
          email: seller.email,
          password,
          role: 'seller',
          note: 'Local demo account only. No identity or funds are verified.',
        },
        null,
        2,
      ),
      { mode: 0o600 },
    )
  }
  let project = await prisma.development_projects.findUnique({ where: { slug } })
  if (!project) {
    project = await prisma.development_projects.create({
      data: {
        slug,
        owner_id: seller.id,
        title: 'Callao Salvaje · Costa Adeje',
        location: 'Callao Salvaje, Costa Adeje, Tenerife, Spain',
        asset_type: 'land',
        currency: 'EUR',
        stage: 'fundraising',
        published: true,
        is_demo: true,
        description:
          'Villa project · 620 m² plot · 250 m² built area · 2 floors · 5 bedrooms · infinity pool · panoramic sea views · 200 m from the beach.\nProyecto de villa: licencia de obra y proyecto arquitectónico incluidos según el vendedor.\nДанные продавца: проект и лицензия включены. Юридическая проверка не выполнена.',
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
          sellerGoal: 'partner',
          license:
            'Seller memorandum: building permit and architectural project included. Not independently verified. / По данным продавца; без независимой проверки.',
          assumptions:
            'SOURCE: Costa_Adeje_Institutional.pdf + seller description. Land €580,000; construction €550,000; sale €2,200,000. Gross profit €1,070,000; gross project ROI 94.69%.\nDEMO ASSUMPTIONS ONLY: 18 months; full €1,130,000 investor financing; 12% simple annual preferred return; SellYourBrick receives 20% of residual profit, developer 80%. These terms are NOT agreed in the source document.\nTaxes, selling costs and contingency are not supplied: otherCosts=0 reproduces the seller’s gross illustration, not a complete net budget. No investor funds have been collected.\nСрок 18 месяцев, ставка 12% и распределение остатка 20/80 — тестовые допущения, не условия исходного документа. Налоги и расходы продажи не предоставлены. Средства не собраны.',
        },
        history: [
          {
            stage: 'land',
            at: new Date().toISOString(),
            note: 'Demo: land project supplied by seller.',
          },
          {
            stage: 'fundraising',
            at: new Date().toISOString(),
            note: 'Demo opened for testing; no funds collected.',
          },
        ],
      },
    })
    const pdf = process.argv[2]
    if (pdf && existsSync(pdf)) {
      mkdirSync('server/private-development', { recursive: true })
      copyFileSync(pdf, 'server/private-development/costa-adeje-demo-memorandum.pdf')
      await prisma.development_projects.update({
        where: { id: project.id },
        data: {
          documents: [
            {
              id: 'demo-memorandum',
              name: 'Costa_Adeje_Institutional.pdf',
              mime: 'application/pdf',
              kind: 'memorandum',
              file: 'costa-adeje-demo-memorandum.pdf',
            },
          ],
        },
      })
    }
  }
  console.log(
    JSON.stringify(
      {
        projectId: project.id,
        slug,
        ownerId: seller.id,
        ownerEmail: seller.email,
        path: `/development/${slug}`,
        createdOrReused: true,
        collectedCapital: Number((await prisma.development_funding.aggregate({ where: { project_id: project.id }, _sum: { amount: true } }))._sum.amount || 0),
      },
      null,
      2,
    ),
  )
} finally {
  await closePrisma()
}
