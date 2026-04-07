import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

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
    await prisma.$disconnect();
    prisma = null;
  }
}
