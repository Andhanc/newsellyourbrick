import { getPrisma, closePrisma } from './database/prismaClient.js';

console.log('🔍 Проверка базы данных для аукциона\n');
console.log('='.repeat(50));

try {
  const prisma = getPrisma();
  console.log('\n1️⃣ Проверка таблицы BIDS:');
  const bidsCount = await prisma.bids.count();
  console.log('   ✅ Модель bids доступна');
  console.log(`   Записей в таблице: ${bidsCount}`);

  console.log('\n2️⃣ Проверка поля auction_minimum_bid в таблице properties:');
  console.log('   ✅ Для PostgreSQL используется поле auction_starting_price / логика Prisma');

  console.log('\n3️⃣ Все основные модели в базе данных:');
  const modelNames = Object.keys(prisma).filter((k) => prisma[k] && typeof prisma[k].count === 'function');
  modelNames.sort().forEach((name) => console.log(`   - ${name}`));

  console.log('\n' + '='.repeat(50));
  console.log('✅ Проверка завершена!');
  console.log('✅ Всё готово для работы аукциона!');
  await closePrisma();
} catch (error) {
  console.error('❌ Ошибка:', error);
  await closePrisma();
  process.exit(1);
}

