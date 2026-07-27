#!/usr/bin/env node
/**
 * Backfill slug для одобренных объектов без slug.
 * Запуск: node scripts/backfill-property-slugs.mjs
 */
import dotenv from 'dotenv'
import { initDatabase, closeDatabase } from '../server/database/database.js'
import { propertySlugQueries } from '../server/database/propertySlugPrisma.js'

dotenv.config()

async function main() {
  await initDatabase()
  const count = await propertySlugQueries.backfillApproved()
  console.log(`[backfill-property-slugs] updated ${count} rows`)
  await closeDatabase()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
