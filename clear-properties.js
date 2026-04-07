import { getPrisma, closePrisma } from './server/database/prismaClient.js';

console.log('🧹 Начинаю очистку объектов недвижимости из базы данных...\n');

try {
  const prisma = getPrisma();
  await prisma.$transaction(async (tx) => {
    await tx.bids.deleteMany({});
    await tx.purchase_requests.deleteMany({});
    await tx.property_shares.deleteMany({});
    await tx.transactions.deleteMany({});
    await tx.properties_apartments.deleteMany({});
    await tx.properties_houses.deleteMany({});
    await tx.properties.deleteMany({});
  });
  console.log('\n✅ Объекты недвижимости успешно удалены из базы данных!');
  await closePrisma();
  process.exit(0);
} catch (error) {
  console.error('\n❌ Ошибка при очистке базы данных:', error.message);
  await closePrisma();
  process.exit(1);
}
