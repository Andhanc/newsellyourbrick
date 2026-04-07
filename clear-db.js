import { getPrisma, closePrisma } from './server/database/prismaClient.js';

console.log('🗑️  Очистка базы данных...\n');

try {
  const prisma = getPrisma();
  const usersCount = await prisma.users.count();
  const documentsCount = await prisma.documents.count();
  const notificationsCount = await prisma.notifications.count();
  const administratorsCount = await prisma.administrators.count();
  console.log('📊 Текущее состояние базы:');
  console.log(`  - Пользователей: ${usersCount}`);
  console.log(`  - Документов: ${documentsCount}`);
  console.log(`  - Уведомлений: ${notificationsCount}`);
  console.log(`  - Администраторов: ${administratorsCount}\n`);

  await prisma.$transaction(async (tx) => {
    await tx.notifications.deleteMany({});
    await tx.documents.deleteMany({});
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

