#!/usr/bin/env node
/**
 * Создаёт (или обновляет) тестовые аккаунты покупателя и продавца для обхода кабинетов.
 * Пароль SHA-256, как в POST /api/auth/email/login.
 */
import { createHash } from 'node:crypto'
import { config } from 'dotenv'
import { getPrisma, closePrisma } from '../server/database/prismaClient.js'

config()

const PASSWORD = 'RequestAudit2026!'
const HASH = createHash('sha256').update(PASSWORD).digest('hex')

const ACCOUNTS = [
  {
    email: 'request-audit-buyer@sellyourbrick.test',
    first_name: 'Request',
    last_name: 'AuditBuyer',
    role: 'buyer',
    phone_number: '+19990001001',
    country: 'Belarus',
    address: 'Minsk, Kiselyova 18',
    passport_number: 'MP1234567',
    identification_number: '1234567A001PB1',
  },
  {
    email: 'request-audit-seller@sellyourbrick.test',
    first_name: 'Request',
    last_name: 'AuditSeller',
    role: 'seller',
    phone_number: '+19990001002',
    country: 'Belarus',
    address: 'Minsk, Kiselyova 18',
  },
]

async function upsertAccount(prisma, spec) {
  const existing = await prisma.users.findFirst({
    where: { email: spec.email, role: spec.role },
  })
  const data = {
    first_name: spec.first_name,
    last_name: spec.last_name,
    email: spec.email,
    password: HASH,
    role: spec.role,
    is_verified: 1,
    is_blocked: 0,
    is_online: 0,
    updated_at: new Date(),
    ...(spec.country ? { country: spec.country } : {}),
    ...(spec.address ? { address: spec.address } : {}),
    ...(spec.passport_number ? { passport_number: spec.passport_number } : {}),
    ...(spec.identification_number ? { identification_number: spec.identification_number } : {}),
  }

  if (existing) {
    await prisma.users.update({
      where: { id: existing.id },
      data,
    })
    return { ...existing, ...data, id: existing.id, created: false }
  }

  const byPhone = await prisma.users.findFirst({ where: { phone_number: spec.phone_number } })
  const phone = byPhone && byPhone.email !== spec.email ? `${spec.phone_number}${Date.now() % 1000}` : spec.phone_number

  const created = await prisma.users.create({
    data: {
      ...data,
      phone_number: phone,
      created_at: new Date(),
    },
  })
  return { ...created, created: true }
}

async function main() {
  const prisma = getPrisma()
  const out = []
  for (const spec of ACCOUNTS) {
    const row = await upsertAccount(prisma, spec)
    out.push({
      created: Boolean(row.created),
      id: row.id,
      email: spec.email,
      role: spec.role,
      password: PASSWORD,
    })
  }
  console.log(JSON.stringify({ ok: true, users: out }, null, 2))
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => closePrisma())
