import { getPrisma, closePrisma } from './server/database/prismaClient.js';

console.log('🧹 Начинаю ПОЛНУЮ очистку базы данных...\n');

try {
  const prisma = getPrisma();
  await prisma.$transaction(async (tx) => {
    await tx.notifications.deleteMany({});
    await tx.documents.deleteMany({});
    await tx.bids.deleteMany({});
    await tx.purchase_requests.deleteMany({});
    await tx.property_shares.deleteMany({});
    await tx.transactions.deleteMany({});
    await tx.properties_apartments.deleteMany({});
    await tx.properties_houses.deleteMany({});
    await tx.properties.deleteMany({});
    await tx.whatsapp_users.deleteMany({});
    await tx.users.deleteMany({});
    await tx.administrators.deleteMany({ where: { username: { not: 'admin' } } });
  });
  console.log('\n✅ База данных успешно очищена!');
  await closePrisma();
  process.exit(0);
} catch (error) {
  console.error('\n❌ Ошибка при очистке базы данных:', error.message);
  await closePrisma();
  process.exit(1);
}
