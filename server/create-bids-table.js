import { getPrisma, closePrisma } from './database/prismaClient.js';

try {
  const prisma = getPrisma();
  await prisma.bids.count();
  await prisma.properties.count();
  console.log('✅ Модели bids и properties доступны через Prisma.');
  console.log('ℹ️ Для PostgreSQL структура создается через Prisma migrations.');
  await closePrisma();
  console.log('✅ Готово!');
} catch (error) {
  console.error('❌ Ошибка:', error);
  await closePrisma();
  process.exit(1);
}

