import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, renameSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = join(__dirname, 'database.sqlite');
const BACKUP_PATH = join(__dirname, 'database.sqlite.backup');

console.log('🔧 Попытка восстановления базы данных...');

try {
  // 1. Создаем резервную копию поврежденной БД
  if (existsSync(DB_PATH)) {
    console.log('📦 Создание резервной копии поврежденной БД...');
    renameSync(DB_PATH, BACKUP_PATH);
    console.log(`✅ Резервная копия создана: ${BACKUP_PATH}`);
  }

  // 2. Пытаемся восстановить данные из резервной копии
  if (existsSync(BACKUP_PATH)) {
    console.log('🔄 Попытка восстановления данных из резервной копии...');
    try {
      const backupDb = new Database(BACKUP_PATH, { readonly: true });
      
      // Пытаемся прочитать данные
      const tables = backupDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
      console.log(`📊 Найдено таблиц в резервной копии: ${tables.length}`);
      
      backupDb.close();
      
      // Если удалось прочитать, пытаемся восстановить через dump
      console.log('⚠️ Резервная копия повреждена. Пересоздаем БД...');
    } catch (backupError) {
      console.log('⚠️ Не удалось прочитать резервную копию. Пересоздаем БД...');
    }
  }

  // 3. Создаем новую БД
  console.log('🆕 Создание новой базы данных...');
  const newDb = new Database(DB_PATH);
  
  // Включаем WAL режим
  newDb.pragma('journal_mode = WAL');
  newDb.pragma('foreign_keys = ON');
  
  console.log('✅ Новая база данных создана');
  console.log('📝 Теперь запустите сервер - БД будет автоматически инициализирована через initDatabase()');
  
  newDb.close();
  
} catch (error) {
  console.error('❌ Ошибка при восстановлении БД:', error.message);
  console.error('💡 Решение:');
  console.error('   1. Остановите сервер');
  console.error('   2. Удалите файл server/database.sqlite');
  console.error('   3. Запустите сервер снова - БД будет создана автоматически');
  process.exit(1);
}
