import 'dotenv/config'
import crypto from 'node:crypto'
import { getPrisma } from '../server/database/prismaClient.js'

const EMAIL = 'codex@sellyourbrick.test'
const PASSWORD = 'CodexTest2026!'
const PHONE_CANDIDATES = ['+375290002026', '+375330002026', '+375440002026']
const DEPOSIT_AMOUNT = 100_000

const prisma = getPrisma()

function isBuyerRole(role) {
  const normalized = String(role || 'buyer').toLowerCase()
  return normalized === 'buyer' || normalized === 'client'
}

async function pickPhone(userId) {
  for (const phone of PHONE_CANDIDATES) {
    const owner = await prisma.users.findFirst({
      where: { phone_number: phone },
      select: { id: true },
    })
    if (!owner || owner.id === userId) return phone
  }
  throw new Error('No free deterministic phone number for the Codex test user')
}

try {
  const existingRows = await prisma.users.findMany({
    where: { email: { equals: EMAIL, mode: 'insensitive' } },
    orderBy: { id: 'asc' },
  })
  const existingBuyer = existingRows.find((row) => isBuyerRole(row.role)) || null
  const phone = await pickPhone(existingBuyer?.id)
  const passwordHash = crypto.createHash('sha256').update(PASSWORD).digest('hex')
  const now = new Date()

  const commonData = {
    first_name: 'Codex',
    last_name: 'Test',
    email: EMAIL,
    password: passwordHash,
    phone_number: phone,
    passport_series: 'CODEX',
    passport_number: '202600001',
    identification_number: 'CODEX-TEST-VERIFIED-2026',
    address: 'Test environment',
    country: 'Belarus',
    // Реальный статический файл проекта: карточка документа не показывает broken image.
    passport_photo: '/favicon.svg',
    is_verified: 1,
    role: 'buyer',
    is_online: 0,
    is_blocked: 0,
    has_card: 1,
    deposit_amount: DEPOSIT_AMOUNT,
    updated_at: now,
  }

  const user = existingBuyer
    ? await prisma.users.update({ where: { id: existingBuyer.id }, data: commonData })
    : await prisma.users.create({
        data: {
          ...commonData,
          user_id_number: '92026',
          created_at: now,
        },
      })

  const document = await prisma.documents.findFirst({
    where: { user_id: user.id, document_type: 'passport' },
    orderBy: { id: 'asc' },
  })
  const approvedDocumentData = {
    document_photo: '/favicon.svg',
    is_reviewed: 1,
    verification_status: 'approved',
    reviewed_by: 'codex-test-seed',
    reviewed_at: now,
    rejection_reason: null,
  }
  if (document) {
    await prisma.documents.update({
      where: { id: document.id },
      data: approvedDocumentData,
    })
  } else {
    await prisma.documents.create({
      data: {
        user_id: user.id,
        document_type: 'passport',
        ...approvedDocumentData,
      },
    })
  }

  const verified = await prisma.users.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      email: true,
      role: true,
      is_verified: true,
      is_blocked: true,
      deposit_amount: true,
      password: true,
      documents: {
        where: { document_type: 'passport' },
        select: { verification_status: true, is_reviewed: true },
      },
    },
  })

  const valid =
    verified?.email === EMAIL &&
    isBuyerRole(verified.role) &&
    verified.is_verified === 1 &&
    verified.is_blocked === 0 &&
    verified.deposit_amount === DEPOSIT_AMOUNT &&
    verified.password === passwordHash &&
    verified.documents.some(
      (item) => item.verification_status === 'approved' && item.is_reviewed === 1,
    )
  if (!valid) throw new Error('Codex test user read-back verification failed')

  console.log(
    JSON.stringify({
      result: existingBuyer ? 'updated' : 'created',
      userId: verified.id,
      email: verified.email,
      role: verified.role,
      verified: true,
      depositAmount: verified.deposit_amount,
      verificationDocument: 'approved',
    }),
  )
} finally {
  await prisma.$disconnect()
}
