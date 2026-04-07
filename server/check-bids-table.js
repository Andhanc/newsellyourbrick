import { getPrisma, closePrisma } from './database/prismaClient.js';

try {
  const prisma = getPrisma();
  console.log('📊 Проверка таблицы bids:\n');
  const count = await prisma.bids.count();
  console.log(`Количество записей в таблице: ${count}`);
  const sample = await prisma.bids.findFirst({ orderBy: { id: 'desc' } });
  if (sample) {
    console.log('\nПример записи:', sample);
  }
  const modelNames = Object.keys(prisma).filter((k) => prisma[k] && typeof prisma[k].count === 'function');
  console.log('\nВсе модели Prisma:');
  modelNames.sort().forEach((m) => console.log(`  - ${m}`));
  await closePrisma();
} catch (error) {
  console.error('❌ Ошибка:', error);
  await closePrisma();
  process.exit(1);
}

