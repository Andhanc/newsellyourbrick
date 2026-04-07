import { getPrisma, closePrisma } from './database/prismaClient.js';

console.log('🔧 Проверка подключения к PostgreSQL...');

try {
  const prisma = getPrisma();
  await prisma.$queryRaw`SELECT 1`;
  console.log('✅ Подключение к PostgreSQL успешно');
  console.log('📝 Для восстановления структуры используйте: npx prisma migrate deploy');
  await closePrisma();
} catch (error) {
  console.error('❌ Ошибка подключения к PostgreSQL:', error.message);
  console.error('💡 Проверьте:');
  console.error('   1. DATABASE_URL в .env');
  console.error('   2. Доступность PostgreSQL');
  console.error('   3. Выполнение миграций Prisma');
  await closePrisma();
  process.exit(1);
}
