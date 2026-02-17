import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = join(__dirname, 'database.sqlite');

try {
  const db = new Database(DB_PATH);
  
  console.log('📊 Проверка и создание таблиц чата:\n');
  
  // Проверяем существование таблиц
  const chatsTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='chats'").get();
  const messagesTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='chat_messages'").get();
  
  if (chatsTable) {
    console.log('✅ Таблица chats уже существует');
    const chatsInfo = db.prepare("PRAGMA table_info(chats)").all();
    console.log('   Структура:');
    chatsInfo.forEach(col => {
      console.log(`      - ${col.name} (${col.type})`);
    });
  } else {
    console.log('❌ Таблица chats НЕ найдена! Создаю...');
  }
  
  if (messagesTable) {
    console.log('✅ Таблица chat_messages уже существует');
    const messagesInfo = db.prepare("PRAGMA table_info(chat_messages)").all();
    console.log('   Структура:');
    messagesInfo.forEach(col => {
      console.log(`      - ${col.name} (${col.type})`);
    });
  } else {
    console.log('❌ Таблица chat_messages НЕ найдена! Создаю...');
  }
  
  // Создаем таблицы, если их нет
  if (!chatsTable || !messagesTable) {
    console.log('\n🔄 Создание таблиц для чата...');
    const chatTablesSql = readFileSync(join(__dirname, 'database', 'add_chat_tables.sql'), 'utf8');
    db.exec(chatTablesSql);
    console.log('✅ Таблицы для чата созданы');
    
    // Проверяем еще раз
    const chatsTableAfter = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='chats'").get();
    const messagesTableAfter = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='chat_messages'").get();
    
    if (chatsTableAfter && messagesTableAfter) {
      console.log('\n✅ Таблицы успешно созданы!');
      
      // Показываем структуру
      console.log('\n📋 Структура таблицы chats:');
      const chatsInfo = db.prepare("PRAGMA table_info(chats)").all();
      chatsInfo.forEach(col => {
        console.log(`   - ${col.name} (${col.type})`);
      });
      
      console.log('\n📋 Структура таблицы chat_messages:');
      const messagesInfo = db.prepare("PRAGMA table_info(chat_messages)").all();
      messagesInfo.forEach(col => {
        console.log(`   - ${col.name} (${col.type})`);
      });
      
      // Показываем индексы
      console.log('\n📋 Индексы:');
      const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND (tbl_name='chats' OR tbl_name='chat_messages')").all();
      indexes.forEach(idx => console.log(`   - ${idx.name}`));
    } else {
      console.log('\n❌ Ошибка: таблицы не были созданы!');
    }
  } else {
    console.log('\n✅ Все таблицы уже существуют');
  }
  
  // Показываем все таблицы в БД
  const allTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
  console.log('\n📊 Все таблицы в базе данных:');
  allTables.forEach(t => console.log(`   - ${t.name}`));
  
  db.close();
  console.log('\n✅ Готово!');
} catch (error) {
  console.error('❌ Ошибка:', error);
  process.exit(1);
}

