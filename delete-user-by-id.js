import { getPrisma, closePrisma } from './server/database/prismaClient.js';
const userIds = [23, 24];

try {
  const prisma = getPrisma();
  
  let totalDeleted = 0;
  
  for (const userId of userIds) {
    console.log(`\n🔍 Обработка пользователя ID ${userId}...`);
    
    // Проверяем, существует ли пользователь
    const user = await prisma.users.findUnique({ where: { id: Number(userId) } });
    
    if (!user) {
      console.log(`❌ Пользователь с id=${userId} не найден в базе данных`);
      continue;
    }
    
    console.log('📋 Найден пользователь:');
    console.log('  ID:', user.id);
    console.log('  Имя:', user.first_name, user.last_name || '');
    console.log('  Email:', user.email || '(не указан)');
    console.log('  Телефон:', user.phone_number || '(не указан)');
    
    // Удаляем пользователя
    await prisma.users.delete({ where: { id: Number(userId) } });
    if (true) {
      console.log(`✅ Пользователь с id=${userId} успешно удален из базы данных`);
      totalDeleted++;
    }
  }
  
  console.log(`\n📊 Итого удалено пользователей: ${totalDeleted} из ${userIds.length}`);
  await closePrisma();
} catch (error) {
  console.error('❌ Ошибка при удалении пользователя:', error.message);
  await closePrisma();
  process.exit(1);
}

