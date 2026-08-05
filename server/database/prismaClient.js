// @prisma/client — CJS; в ESM именованный импорт падает на Node 20 (Railway).
import prismaPkg from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const { PrismaClient } = prismaPkg;

let prisma;

export function getPrisma() {
  if (!prisma) {
    const connectionString = (process.env.DATABASE_URL || '').trim();
    if (!connectionString) {
      throw new Error('DATABASE_URL is required for PostgreSQL.');
    }

    const adapter = new PrismaPg({ connectionString });
    prisma = new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  }

  return prisma;
}

export async function closePrisma() {
  if (prisma) {
    try {
      await prisma.$disconnect()
    } catch (error) {
      console.warn('closePrisma:', error?.message || error)
    } finally {
      prisma = null
    }
  }
}
