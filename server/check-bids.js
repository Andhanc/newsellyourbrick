import { getPrisma, closePrisma } from './database/prismaClient.js';

try {
  const prisma = getPrisma();
  console.log('📊 Проверка ставок в базе данных:\n');
  const bids = await prisma.bids.findMany({
    orderBy: { created_at: 'desc' },
    take: 10,
  });
  if (bids.length === 0) {
    console.log('⚠️ В таблице bids нет записей');
  } else {
    console.log(`✅ Найдено ${bids.length} ставок:\n`);
    bids.forEach((bid, index) => {
      console.log(`${index + 1}. Ставка ID: ${bid.id}`);
      console.log(`   Пользователь: ${bid.user_id}`);
      console.log(`   Объект: ${bid.property_id}`);
      console.log(`   Сумма: ${bid.bid_amount}`);
      console.log(`   Дата: ${bid.created_at}`);
      console.log('');
    });
  }
  await closePrisma();
} catch (error) {
  console.error('❌ Ошибка:', error);
  await closePrisma();
  process.exit(1);
}

