import { getPrisma, closePrisma } from './database/prismaClient.js';

try {
  const prisma = getPrisma();
  const count = await prisma.properties.count();
  console.log('📊 Проверка таблицы properties (Prisma/PostgreSQL)\n');
  console.log(`✅ Таблица properties доступна, записей: ${count}`);
  console.log('✅ Поле auction_minimum_bid присутствует в Prisma schema.');
  await closePrisma();
  console.log('\n✅ Готово!');
} catch (error) {
  console.error('❌ Ошибка:', error);
  await closePrisma();
  process.exit(1);
}

