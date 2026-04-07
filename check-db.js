import { getPrisma, closePrisma } from './server/database/prismaClient.js';

try {
  const prisma = getPrisma();
  console.log('📊 Проверка базы данных...\n');
  console.log('='.repeat(60));
  const users = await prisma.users.findMany({
    orderBy: { created_at: 'desc' },
    take: 10,
  });
  if (users.length === 0) {
    console.log('❌ В базе данных нет пользователей');
  } else {
    console.log(`✅ Найдено пользователей: ${users.length}\n`);
    users.forEach((user, index) => {
      console.log(`\n👤 Пользователь #${index + 1}:`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Имя: ${user.first_name || 'Не указано'}`);
      console.log(`   Фамилия: ${user.last_name || 'Не указано'}`);
      console.log(`   Email: ${user.email || '(не указан - регистрация через WhatsApp)'}`);
      console.log(`   Телефон: ${user.phone_number || 'Не указан'}`);
      console.log(`   Страна: ${user.country || 'Не указана'}`);
      console.log(`   Роль: ${user.role || 'buyer'}`);
      console.log(`   Верифицирован: ${user.is_verified ? 'Да' : 'Нет'}`);
      console.log(`   Онлайн: ${user.is_online ? 'Да' : 'Нет'}`);
      console.log(`   Создан: ${new Date(user.created_at).toLocaleString('ru-RU')}`);
    });
  }
  console.log('\n' + '='.repeat(60));
  await closePrisma();
} catch (error) {
  console.error('❌ Ошибка при проверке базы данных:', error.message);
  await closePrisma();
  process.exit(1);
}

