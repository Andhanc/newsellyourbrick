import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, existsSync, renameSync, unlinkSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Путь к файлу базы данных
const DB_PATH = join(__dirname, '..', 'database.sqlite');

// Создаем или открываем базу данных
let db = null;

/** Кэш наличия таблиц недвижимости (заполняется при init, не вызывать sqlite_master в рантайме) */
export const schemaCache = { properties: false, properties_apartments: false, properties_houses: false };

// Настройки для стабильной работы БД
const DB_CONFIG = {
  // Включаем WAL режим для лучшего параллелизма чтения/записи
  // WAL позволяет множественным читателям работать одновременно с писателем
  // Это значительно улучшает производительность при множественных запросах
  wal: true,
  
  // Время ожидания при блокировке БД (в миллисекундах)
  // Если БД заблокирована другим процессом, будем ждать до 10 секунд
  // вместо немедленного возврата ошибки
  busyTimeout: 10000,
  
  // Включаем строгий режим для лучшей валидации данных
  strict: false,
  
  // Включаем журналирование SQL для отладки (в production можно отключить)
  verbose: null
};

// Константы для retry логики
const RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 100, // миллисекунды
  retryableErrors: [
    'SQLITE_BUSY',
    'SQLITE_LOCKED',
    'database is locked',
    'database disk image is malformed'
  ]
};

/**
 * Проверяет, нужно ли обновить схему БД
 */
function checkAndUpdateSchema(dbInstance) {
  try {
    // Проверяем, существует ли таблица users
    const tableInfo = dbInstance.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();
    
    if (tableInfo) {
      // Таблица существует, проверяем структуру
      const pragmaInfo = dbInstance.prepare("PRAGMA table_info(users)").all();
      const emailColumn = pragmaInfo.find(col => col.name === 'email');
      const passwordColumn = pragmaInfo.find(col => col.name === 'password');
      
      let needsUpdate = false;
      
      // Если email имеет ограничение NOT NULL, обновляем схему
      if (emailColumn && emailColumn.notnull === 1) {
        console.log('🔄 Обновление схемы БД: делаем email nullable...');
        needsUpdate = true;
      }
      
      // Если поле password отсутствует, добавляем его
      if (!passwordColumn) {
        console.log('🔄 Обновление схемы БД: добавляем поле password...');
        needsUpdate = true;
      }
      
      // Проверяем, есть ли поле is_blocked
      const isBlockedColumn = pragmaInfo.find(col => col.name === 'is_blocked');
      if (!isBlockedColumn) {
        console.log('🔄 Обновление схемы БД: добавляем поле is_blocked...');
        needsUpdate = true;
      }
      
      // Проверяем, есть ли поля для карты и депозита
      const hasCardColumn = pragmaInfo.find(col => col.name === 'has_card');
      const depositAmountColumn = pragmaInfo.find(col => col.name === 'deposit_amount');
      if (!hasCardColumn || !depositAmountColumn) {
        console.log('🔄 Обновление схемы БД: добавляем поля для карты и депозита...');
        needsUpdate = true;
      }
      
      // Проверяем, есть ли поле user_id_number (5-значный идентификационный номер)
      const userIdNumberColumn = pragmaInfo.find(col => col.name === 'user_id_number');
      if (!userIdNumberColumn) {
        console.log('🔄 Обновление схемы БД: добавляем поле user_id_number...');
        needsUpdate = true;
      }

      // Проверяем поля для Telegram Login
      const telegramIdColumn = pragmaInfo.find(col => col.name === 'telegram_id');
      if (!telegramIdColumn) {
        console.log('🔄 Обновление схемы БД: добавляем поля telegram_id, telegram_username, telegram_photo_url...');
        needsUpdate = true;
      }

      // Логин в кабинете продавца (отдельно от telegram_username)
      const usersUsernameColumn = pragmaInfo.find(col => col.name === 'username');
      if (!usersUsernameColumn) {
        console.log('🔄 Обновление схемы БД: добавляем поле username в users...');
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        try {
          // Если нет поля password, добавляем его
          if (!passwordColumn) {
            dbInstance.exec("ALTER TABLE users ADD COLUMN password TEXT");
            console.log('✅ Поле password добавлено в таблицу users');
          }
          
          // Если нет поля is_blocked, добавляем его
          if (!isBlockedColumn) {
            try {
              dbInstance.exec("ALTER TABLE users ADD COLUMN is_blocked INTEGER DEFAULT 0");
              console.log('✅ Поле is_blocked добавлено в таблицу users');
              // Создаем индекс
              dbInstance.exec("CREATE INDEX IF NOT EXISTS idx_users_is_blocked ON users(is_blocked)");
              console.log('✅ Индекс idx_users_is_blocked создан');
            } catch (blockedError) {
              console.warn('⚠️ Не удалось добавить поле is_blocked:', blockedError.message);
            }
          }
          
          // Добавляем поля для карты и депозита, если их нет
          if (!hasCardColumn) {
            try {
              dbInstance.exec("ALTER TABLE users ADD COLUMN has_card INTEGER DEFAULT 0");
              console.log('✅ Поле has_card добавлено в таблицу users');
            } catch (cardError) {
              console.warn('⚠️ Не удалось добавить поле has_card:', cardError.message);
            }
          }
          if (!depositAmountColumn) {
            try {
              dbInstance.exec("ALTER TABLE users ADD COLUMN deposit_amount REAL DEFAULT 0");
              console.log('✅ Поле deposit_amount добавлено в таблицу users');
            } catch (depositError) {
              console.warn('⚠️ Не удалось добавить поле deposit_amount:', depositError.message);
            }
          }
          // Добавляем остальные поля карты
          const cardNumberColumn = pragmaInfo.find(col => col.name === 'card_number');
          const cardTypeColumn = pragmaInfo.find(col => col.name === 'card_type');
          const cardCvvColumn = pragmaInfo.find(col => col.name === 'card_cvv');
          if (!cardNumberColumn) {
            try {
              dbInstance.exec("ALTER TABLE users ADD COLUMN card_number TEXT");
              console.log('✅ Поле card_number добавлено в таблицу users');
            } catch (e) {
              console.warn('⚠️ Не удалось добавить поле card_number:', e.message);
            }
          }
          if (!cardTypeColumn) {
            try {
              dbInstance.exec("ALTER TABLE users ADD COLUMN card_type TEXT");
              console.log('✅ Поле card_type добавлено в таблицу users');
            } catch (e) {
              console.warn('⚠️ Не удалось добавить поле card_type:', e.message);
            }
          }
          if (!cardCvvColumn) {
            try {
              dbInstance.exec("ALTER TABLE users ADD COLUMN card_cvv TEXT");
              console.log('✅ Поле card_cvv добавлено в таблицу users');
            } catch (e) {
              console.warn('⚠️ Не удалось добавить поле card_cvv:', e.message);
            }
          }
          // Создаем индекс для has_card
          try {
            dbInstance.exec("CREATE INDEX IF NOT EXISTS idx_users_has_card ON users(has_card)");
            console.log('✅ Индекс idx_users_has_card создан');
          } catch (e) {
            // Индекс может уже существовать
          }
          
          // Добавляем поле user_id_number, если его нет
          if (!userIdNumberColumn) {
            try {
              // Добавляем поле БЕЗ UNIQUE (SQLite не позволяет добавить UNIQUE колонку в таблицу с данными)
              // Уникальность обеспечивается функцией generateUniqueUserIdNumber()
              dbInstance.exec("ALTER TABLE users ADD COLUMN user_id_number TEXT");
              console.log('✅ Поле user_id_number добавлено в таблицу users');
              // Создаем индекс для быстрого поиска
              dbInstance.exec("CREATE INDEX IF NOT EXISTS idx_users_id_number ON users(user_id_number)");
              console.log('✅ Индекс idx_users_id_number создан');
            } catch (e) {
              console.warn('⚠️ Не удалось добавить поле user_id_number:', e.message);
            }
          }

          // Добавляем поля для Telegram Login Widget
          if (!telegramIdColumn) {
            try {
              dbInstance.exec("ALTER TABLE users ADD COLUMN telegram_id TEXT");
              console.log('✅ Поле telegram_id добавлено в таблицу users');
              dbInstance.exec("ALTER TABLE users ADD COLUMN telegram_username TEXT");
              console.log('✅ Поле telegram_username добавлено в таблицу users');
              dbInstance.exec("ALTER TABLE users ADD COLUMN telegram_photo_url TEXT");
              console.log('✅ Поле telegram_photo_url добавлено в таблицу users');
              dbInstance.exec("CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id)");
              console.log('✅ Индекс idx_users_telegram_id создан');
            } catch (e) {
              console.warn('⚠️ Не удалось добавить поля Telegram:', e.message);
            }
          }

          if (!usersUsernameColumn) {
            try {
              dbInstance.exec('ALTER TABLE users ADD COLUMN username TEXT');
              console.log('✅ Поле username добавлено в таблицу users');
              dbInstance.exec('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)');
            } catch (e) {
              console.warn('⚠️ Не удалось добавить поле username:', e.message);
            }
          }
          
          // Если email NOT NULL, исправляем
          if (emailColumn && emailColumn.notnull === 1) {
            const fixSql = readFileSync(join(__dirname, 'fix_email_nullable.sql'), 'utf8');
            dbInstance.exec(fixSql);
            console.log('✅ Схема БД успешно обновлена (email nullable)');
          }
        } catch (fixError) {
          console.warn('⚠️ Не удалось обновить схему автоматически:', fixError.message);
          console.warn('   Выполните вручную: sqlite3 database.sqlite < server/database/add_password_field.sql');
        }
      }
    }
  } catch (error) {
    console.warn('⚠️ Ошибка при проверке схемы БД:', error.message);
  }
}

/**
 * Retry обертка для операций с БД
 * Повторяет операцию при возникновении ошибок блокировки
 */
function withRetry(operation, maxRetries = RETRY_CONFIG.maxRetries) {
  let lastError = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return operation();
    } catch (error) {
      lastError = error;
      
      // Проверяем, является ли ошибка перезапускаемой
      const isRetryable = RETRY_CONFIG.retryableErrors.some(retryableError => 
        error.message?.includes(retryableError) || 
        error.code?.includes(retryableError)
      );
      
      if (!isRetryable || attempt >= maxRetries) {
        throw error;
      }
      
      // Задержка перед повтором (экспоненциальный backoff)
      const delay = RETRY_CONFIG.retryDelay * Math.pow(2, attempt);
      console.warn(`⚠️ Ошибка БД (попытка ${attempt + 1}/${maxRetries + 1}):`, error.message);
      console.log(`   Повтор через ${delay}мс...`);
      
      // Синхронная задержка (простая реализация для better-sqlite3)
      const start = Date.now();
      while (Date.now() - start < delay) {
        // Busy wait
      }
    }
  }
  
  throw lastError;
}

/**
 * Выполняет периодическое обслуживание БД (VACUUM, ANALYZE)
 */
function performMaintenance(dbInstance) {
  try {
    console.log('🔧 Выполняю обслуживание БД (VACUUM, ANALYZE)...');
    
    // VACUUM освобождает неиспользуемое пространство и оптимизирует БД
    dbInstance.exec('VACUUM;');
    
    // ANALYZE обновляет статистику для оптимизатора запросов
    dbInstance.exec('ANALYZE;');
    
    console.log('✅ Обслуживание БД завершено');
  } catch (error) {
    // Не критично, просто логируем
    console.warn('⚠️ Ошибка при обслуживании БД:', error.message);
  }
}

/**
 * Удаляет повреждённый файл БД и переименовывает в .corrupted (если возможно)
 */
function removeCorruptedDatabase() {
  const corruptedPath = join(__dirname, '..', 'database.sqlite.corrupted');
  try {
    if (db) {
      try { db.close(); } catch (_) {}
      db = null;
    }
    if (!existsSync(DB_PATH)) return;
    if (existsSync(corruptedPath)) unlinkSync(corruptedPath);
    renameSync(DB_PATH, corruptedPath);
    console.log('📦 Поврежденная БД сохранена как database.sqlite.corrupted');
  } catch (e) {
    console.warn('⚠️ Не удалось переименовать поврежденную БД, удаляю:', e.message);
    try { unlinkSync(DB_PATH); } catch (_) {}
  }
}

function isCorruptError(err) {
  return (err && (err.code === 'SQLITE_CORRUPT' || (err.message && err.message.includes('malformed'))));
}

/**
 * Таблица переводов + колонка debt_severity (идемпотентно, на случай старых БД)
 */
function ensurePropertyAuxSchema(db) {
  try {
    const hasPt = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='property_translations'").get();
    if (!hasPt) {
      const sqlPath = join(__dirname, 'add_property_translations_table.sql');
      if (existsSync(sqlPath)) {
        db.exec(readFileSync(sqlPath, 'utf8'));
        console.log('✅ Таблица property_translations создана из файла');
      } else {
        db.exec(`
          CREATE TABLE IF NOT EXISTS property_translations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            property_id INTEGER NOT NULL,
            property_table TEXT NOT NULL,
            lang_code TEXT NOT NULL,
            title TEXT,
            description TEXT,
            additional_amenities TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            UNIQUE(property_id, property_table, lang_code)
          );
          CREATE INDEX IF NOT EXISTS idx_property_translations_lookup
            ON property_translations(property_id, property_table);
        `);
        console.log('✅ Таблица property_translations создана (встроенная схема)');
      }
    }
  } catch (e) {
    console.warn('⚠️ ensurePropertyAuxSchema property_translations:', e.message);
  }
  for (const table of ['properties_apartments', 'properties_houses']) {
    try {
      const t = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(table);
      if (!t) continue;
      const cols = db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
      if (!cols.includes('debt_severity')) {
        db.exec(`ALTER TABLE ${table} ADD COLUMN debt_severity TEXT`);
        console.log(`✅ Добавлено поле debt_severity в ${table}`);
      }
    } catch (e) {
      if (!String(e.message || '').includes('duplicate column')) {
        console.warn(`⚠️ debt_severity ${table}:`, e.message);
      }
    }
  }
}

/**
 * Инициализация базы данных
 */
export function initDatabase() {
  const retryOnce = arguments[0] === true;
  try {
    // Проверяем, не повреждена ли существующая БД (быстрая проверка)
    if (existsSync(DB_PATH) && !retryOnce) {
      try {
        const testDb = new Database(DB_PATH, { readonly: true });
        testDb.prepare('SELECT 1').get();
        testDb.close();
      } catch (testError) {
        if (isCorruptError(testError)) {
          console.error('❌ Обнаружена поврежденная БД при проверке! Переименовываю и пересоздаю...');
          removeCorruptedDatabase();
        }
      }
    }
    
    // Создаем соединение с БД с улучшенными настройками
    db = new Database(DB_PATH, {
      timeout: DB_CONFIG.busyTimeout,
      verbose: DB_CONFIG.verbose
    });
    
    // Включаем WAL режим для лучшего параллелизма
    // WAL (Write-Ahead Logging) позволяет множественным читателям работать
    // одновременно с одним писателем, что значительно улучшает производительность
    db.pragma('journal_mode = WAL');
    console.log('✅ WAL режим включен для лучшей производительности');
    
    // Устанавливаем busy timeout - БД будет ждать до 10 секунд при блокировке
    db.pragma(`busy_timeout = ${DB_CONFIG.busyTimeout}`);
    console.log(`✅ Busy timeout установлен: ${DB_CONFIG.busyTimeout}мс`);
    
    // Включаем внешние ключи для целостности данных
    db.pragma('foreign_keys = ON');
    console.log('✅ Внешние ключи включены');
    
    // Дополнительные оптимизации для производительности
    // synchronous = NORMAL - хороший баланс между производительностью и надежностью
    db.pragma('synchronous = NORMAL');
    
    // Увеличиваем кэш страниц для лучшей производительности (16MB)
    db.pragma('cache_size = -16384'); // отрицательное значение = килобайты
    
    // Включаем temp_store в памяти для временных таблиц (быстрее)
    db.pragma('temp_store = MEMORY');
    
    console.log('✅ Оптимизации производительности применены');
    
    // ВАЖНО: Сначала проверяем и обновляем схему существующих таблиц,
    // чтобы добавить недостающие колонки ПЕРЕД выполнением init.sql
    // (который может пытаться создавать индексы на этих колонках)
    checkAndUpdateSchema(db);
    
    // Читаем и выполняем SQL-скрипт инициализации
    // Используем try-catch, чтобы игнорировать ошибки, если таблицы/индексы уже существуют
    try {
      const initSql = readFileSync(join(__dirname, 'init.sql'), 'utf8');
      db.exec(initSql);
    } catch (initError) {
      // Игнорируем ошибки "already exists", но логируем другие
      if (!initError.message.includes('already exists') && 
          !initError.message.includes('duplicate column name')) {
        console.warn('⚠️ Ошибка при выполнении init.sql (это нормально для существующих БД):', initError.message);
      }
    }
    
    // Проверяем и обновляем схему документов для верификации
    try {
      const pragmaInfo = db.prepare("PRAGMA table_info(documents)").all();
      const hasVerificationStatus = pragmaInfo.some(col => col.name === 'verification_status');
      const hasRejectionReason = pragmaInfo.some(col => col.name === 'rejection_reason');
      
      if (!hasVerificationStatus || !hasRejectionReason) {
        console.log('🔄 Обновление схемы БД: добавляем поля верификации документов...');
        const migrationSql = readFileSync(join(__dirname, 'add_verification_status.sql'), 'utf8');
        db.exec(migrationSql);
        console.log('✅ Поля верификации документов добавлены');
      }
      
      // Создаем индексы для оптимизации запросов по verification_status
      try {
        db.exec(`
          CREATE INDEX IF NOT EXISTS idx_documents_verification_status ON documents(verification_status);
          CREATE INDEX IF NOT EXISTS idx_documents_user_status ON documents(user_id, verification_status);
        `);
        console.log('✅ Индексы для документов созданы');
      } catch (indexError) {
        // Индексы могут уже существовать, это нормально
        if (!indexError.message.includes('already exists')) {
          console.warn('⚠️ Не удалось создать индексы:', indexError.message);
        }
      }
      
      // Создаем таблицу уведомлений, если её нет
      try {
        const notificationsTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='notifications'").get();
        if (!notificationsTable) {
          console.log('🔄 Создание таблицы уведомлений...');
          db.exec(`
            CREATE TABLE IF NOT EXISTS notifications (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              user_id INTEGER NOT NULL,
              type TEXT NOT NULL,
              title TEXT NOT NULL,
              message TEXT,
              data TEXT,
              is_read INTEGER DEFAULT 0,
              view_count INTEGER DEFAULT 0,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
            CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
            CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
          `);
          console.log('✅ Таблица уведомлений создана');
        }
      } catch (notifError) {
        console.warn('⚠️ Не удалось создать таблицу уведомлений:', notifError.message);
      }

      // Создаем таблицу администраторов, если её нет
      try {
        const administratorsTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='administrators'").get();
        if (!administratorsTable) {
          console.log('🔄 Создание таблицы администраторов...');
          db.exec(`
            CREATE TABLE IF NOT EXISTS administrators (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              username TEXT UNIQUE NOT NULL,
              password TEXT NOT NULL,
              email TEXT,
              full_name TEXT,
              is_super_admin INTEGER DEFAULT 0,
              can_access_statistics INTEGER DEFAULT 0,
              can_access_users INTEGER DEFAULT 0,
              can_access_moderation INTEGER DEFAULT 0,
              can_access_chat INTEGER DEFAULT 0,
              can_access_objects INTEGER DEFAULT 0,
              can_access_access_management INTEGER DEFAULT 0,
              created_by INTEGER,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (created_by) REFERENCES administrators(id) ON DELETE SET NULL
            );
            CREATE INDEX IF NOT EXISTS idx_administrators_username ON administrators(username);
            CREATE INDEX IF NOT EXISTS idx_administrators_is_super_admin ON administrators(is_super_admin);
            CREATE INDEX IF NOT EXISTS idx_administrators_email ON administrators(email);
          `);
          console.log('✅ Таблица администраторов создана');
        } else {
          // Если таблица уже существует, проверяем и создаем индекс для email, если его нет
          try {
            db.exec('CREATE INDEX IF NOT EXISTS idx_administrators_email ON administrators(email)');
          } catch (indexError) {
            // Индекс может уже существовать, это нормально
            if (!indexError.message.includes('already exists')) {
              console.warn('⚠️ Не удалось создать индекс для email администраторов:', indexError.message);
            }
          }
        }
      } catch (adminError) {
        console.warn('⚠️ Не удалось создать таблицу администраторов:', adminError.message);
      }

      // Таблица причин долга (для кабинета продавца / админки)
      try {
        const debtReasonsTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='debt_reasons'").get();
        if (!debtReasonsTable) {
          console.log('🔄 Создание таблицы debt_reasons...');
          db.exec(`
            CREATE TABLE IF NOT EXISTS debt_reasons (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              title_ru TEXT NOT NULL,
              code TEXT UNIQUE,
              sort_order INTEGER DEFAULT 0,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_debt_reasons_sort ON debt_reasons(sort_order);
          `);
          const insert = db.prepare(`INSERT INTO debt_reasons (title_ru, code, sort_order) VALUES (?, ?, ?)`);
          const defaultReasons = [
            ['Долги по коммунальным услугам', 'utilities', 1],
            ['Неоплаченные налоги на имущество', 'property_taxes', 2],
            ['Залог у банка (ипотека, кредит)', 'mortgage_pledge', 3],
            ['Арест / ограничения на регистрационные действия', 'arrest', 4],
            ['Долги наследодателя', 'inherited', 5],
            ['Долги перед третьими лицами', 'third_party', 6],
            ['Другое (произвольное описание)', 'other', 7]
          ];
          for (const r of defaultReasons) {
            insert.run(r[0], r[1], r[2]);
          }
          console.log('✅ Таблица debt_reasons создана и заполнена');
        }
      } catch (debtReasonsError) {
        console.warn('⚠️ Не удалось создать таблицу debt_reasons:', debtReasonsError.message);
      }

      // Таблица документов по долгу (для объявлений «Долги»)
      try {
        const debtDocsTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='property_debt_documents'").get();
        if (!debtDocsTable) {
          console.log('🔄 Создание таблицы property_debt_documents...');
          db.exec(`
            CREATE TABLE IF NOT EXISTS property_debt_documents (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              property_id INTEGER NOT NULL,
              property_type TEXT NOT NULL,
              document_type TEXT NOT NULL,
              file_path TEXT NOT NULL,
              original_name TEXT,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_debt_docs_property ON property_debt_documents(property_id, property_type);
          `);
          console.log('✅ Таблица property_debt_documents создана');
        }
      } catch (debtDocsError) {
        console.warn('⚠️ Не удалось создать таблицу property_debt_documents:', debtDocsError.message);
      }

      // Создаем таблицу недвижимости, если её нет
      try {
        const propertiesTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='properties'").get();
        if (!propertiesTable) {
          console.log('🔄 Создание таблицы недвижимости...');
          const propertiesSql = readFileSync(join(__dirname, 'add_properties_table.sql'), 'utf8');
          db.exec(propertiesSql);
          console.log('✅ Таблица недвижимости создана');
        } else {
          // Таблица существует, проверяем и добавляем недостающие поля
          const pragmaInfo = db.prepare("PRAGMA table_info(properties)").all();
          const hasLivingArea = pragmaInfo.some(col => col.name === 'living_area');
          const hasBuildingType = pragmaInfo.some(col => col.name === 'building_type');
          const hasAdditionalAmenities = pragmaInfo.some(col => col.name === 'additional_amenities');
          const hasTestDrive = pragmaInfo.some(col => col.name === 'test_drive');
          
          if (!hasLivingArea || !hasBuildingType || !hasAdditionalAmenities) {
            console.log('🔄 Обновление схемы БД: добавляем поля living_area, building_type и additional_amenities...');
            try {
              const migrationSql = readFileSync(join(__dirname, 'add_properties_fields.sql'), 'utf8');
              db.exec(migrationSql);
              console.log('✅ Поля living_area, building_type и additional_amenities добавлены в таблицу properties');
            } catch (migrationError) {
              // Игнорируем ошибки "duplicate column name" (поле уже существует)
              if (!migrationError.message.includes('duplicate column name')) {
                console.warn('⚠️ Не удалось выполнить миграцию properties:', migrationError.message);
              }
            }
          }
          
          // Проверяем и добавляем поле test_drive, если его нет
          if (!hasTestDrive) {
            console.log('🔄 Обновление схемы БД: добавляем поле test_drive...');
            try {
              const migrationSql = readFileSync(join(__dirname, 'add_test_drive_field.sql'), 'utf8');
              db.exec(migrationSql);
              console.log('✅ Поле test_drive добавлено в таблицу properties');
            } catch (migrationError) {
              // Игнорируем ошибки "duplicate column name" (поле уже существует)
              if (!migrationError.message.includes('duplicate column name')) {
                console.warn('⚠️ Не удалось добавить поле test_drive:', migrationError.message);
              }
            }
          }
          
          // Проверяем и добавляем поле test_timer_end_date, если его нет
          const hasTestTimer = pragmaInfo.some(col => col.name === 'test_timer_end_date');
          if (!hasTestTimer) {
            console.log('🔄 Обновление схемы БД: добавляем поле test_timer_end_date...');
            try {
              const migrationSql = readFileSync(join(__dirname, 'add_test_timer_field.sql'), 'utf8');
              db.exec(migrationSql);
              console.log('✅ Поле test_timer_end_date добавлено в таблицу properties');
            } catch (migrationError) {
              // Игнорируем ошибки "duplicate column name" (поле уже существует)
              if (!migrationError.message.includes('duplicate column name')) {
                console.warn('⚠️ Не удалось добавить поле test_timer_end_date:', migrationError.message);
              }
            }
          }
        }
      } catch (propertiesError) {
        console.warn('⚠️ Не удалось создать таблицу недвижимости:', propertiesError.message);
        // Если файл миграции не найден, создаем таблицу напрямую
        if (propertiesError.code === 'ENOENT') {
          try {
            const initSql = readFileSync(join(__dirname, 'init.sql'), 'utf8');
            // Извлекаем только часть с таблицей properties
            const propertiesMatch = initSql.match(/CREATE TABLE IF NOT EXISTS properties[\s\S]*?\);[\s\S]*?CREATE INDEX IF NOT EXISTS idx_properties[\s\S]*?;/g);
            if (propertiesMatch) {
              db.exec(propertiesMatch[0]);
              console.log('✅ Таблица недвижимости создана из init.sql');
            }
          } catch (fallbackError) {
            console.warn('⚠️ Не удалось создать таблицу недвижимости из init.sql:', fallbackError.message);
          }
        }
      }

      // Создаем таблицу WhatsApp пользователей, если её нет
      try {
        const whatsappUsersTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='whatsapp_users'").get();
        if (!whatsappUsersTable) {
          console.log('🔄 Создание таблицы WhatsApp пользователей...');
          const whatsappSql = readFileSync(join(__dirname, 'add_whatsapp_users_table.sql'), 'utf8');
          db.exec(whatsappSql);
          console.log('✅ Таблица WhatsApp пользователей создана');
        }
      } catch (whatsappError) {
        console.warn('⚠️ Не удалось создать таблицу WhatsApp пользователей:', whatsappError.message);
      }

      try {
        const waInfo = db.prepare("PRAGMA table_info(whatsapp_users)").all();
        if (waInfo && waInfo.length && !waInfo.some((c) => c.name === 'lead_type')) {
          db.exec("ALTER TABLE whatsapp_users ADD COLUMN lead_type TEXT DEFAULT 'cold'");
          console.log('✅ Добавлена колонка lead_type в whatsapp_users');
        }
      } catch (waLeadErr) {
        console.warn('⚠️ whatsapp_users lead_type:', waLeadErr.message);
      }

      // Создаем таблицу транзакций, если её нет
      try {
        const transactionsTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='transactions'").get();
        if (!transactionsTable) {
          console.log('🔄 Создание таблицы транзакций...');
          db.exec(`
            CREATE TABLE IF NOT EXISTS transactions (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              user_id INTEGER NOT NULL,
              type TEXT NOT NULL, -- 'deposit', 'withdrawal'
              amount REAL NOT NULL,
              description TEXT,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
            CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
            CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
          `);
          console.log('✅ Таблица транзакций создана');
        }
      } catch (transactionsError) {
        console.warn('⚠️ Не удалось создать таблицу транзакций:', transactionsError.message);
      }

      // Создаем таблицу ставок (bids), если её нет
      try {
        const bidsTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='bids'").get();
        if (!bidsTable) {
          console.log('🔄 Создание таблицы ставок...');
          db.exec(`
            CREATE TABLE IF NOT EXISTS bids (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              user_id INTEGER NOT NULL,
              property_id INTEGER NOT NULL,
              property_table TEXT,
              bid_amount REAL NOT NULL,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_bids_user_id ON bids(user_id);
            CREATE INDEX IF NOT EXISTS idx_bids_property_id ON bids(property_id);
            CREATE INDEX IF NOT EXISTS idx_bids_created_at ON bids(created_at);
            CREATE INDEX IF NOT EXISTS idx_bids_user_property ON bids(user_id, property_id);
            CREATE INDEX IF NOT EXISTS idx_bids_property_id_table ON bids(property_id, property_table);
          `);
          console.log('✅ Таблица ставок создана');
        } else {
          // Миграция: добавить property_table в bids для оптимизации
          const bidsPragma = db.prepare("PRAGMA table_info(bids)").all();
          const hasPropertyTable = bidsPragma.some(col => col.name === 'property_table');
          if (!hasPropertyTable) {
            console.log('🔄 Миграция bids: добавляем колонку property_table...');
            db.exec('ALTER TABLE bids ADD COLUMN property_table TEXT');
            db.exec('CREATE INDEX IF NOT EXISTS idx_bids_property_id_table ON bids(property_id, property_table)');
            // Backfill: для каждой ставки с property_table IS NULL определить таблицу
            const rows = db.prepare('SELECT id, property_id FROM bids WHERE property_table IS NULL').all();
            const updateStmt = db.prepare('UPDATE bids SET property_table = ? WHERE id = ?');
            for (const row of rows) {
              let tbl = null;
              try {
                if (db.prepare('SELECT 1 FROM properties_apartments WHERE id = ?').get(row.property_id)) tbl = 'properties_apartments';
              } catch (_) {}
              if (!tbl) {
                try {
                  if (db.prepare('SELECT 1 FROM properties_houses WHERE id = ?').get(row.property_id)) tbl = 'properties_houses';
                } catch (_) {}
              }
              if (!tbl) {
                try {
                  if (db.prepare('SELECT 1 FROM properties WHERE id = ?').get(row.property_id)) tbl = 'properties';
                } catch (_) {}
              }
              updateStmt.run(tbl || 'properties', row.id);
            }
            console.log(`✅ Backfill bids.property_table: обновлено ${rows.length} записей`);
          }
        }
      } catch (bidsError) {
        console.warn('⚠️ Не удалось создать/обновить таблицу ставок:', bidsError.message);
      }

      // Таблица бронирований тест-драйва (диапазон дат, статус, уведомление владельца)
      try {
        const tdb = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='test_drive_bookings'").get();
        if (!tdb) {
          console.log('🔄 Создание таблицы test_drive_bookings...');
          db.exec(`
            CREATE TABLE IF NOT EXISTS test_drive_bookings (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              property_id INTEGER NOT NULL,
              property_table TEXT NOT NULL DEFAULT 'properties_apartments',
              user_id INTEGER NOT NULL,
              start_date TEXT NOT NULL,
              end_date TEXT NOT NULL,
              status TEXT NOT NULL DEFAULT 'pending',
              owner_notification_id INTEGER,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_tdb_property ON test_drive_bookings(property_id, property_table);
            CREATE INDEX IF NOT EXISTS idx_tdb_user ON test_drive_bookings(user_id);
            CREATE INDEX IF NOT EXISTS idx_tdb_status ON test_drive_bookings(status);
          `);
          console.log('✅ Таблица test_drive_bookings создана');
        } else {
          const tdbPragma = db.prepare('PRAGMA table_info(test_drive_bookings)').all();
          const hasOwnerNotif = tdbPragma.some((col) => col.name === 'owner_notification_id');
          if (!hasOwnerNotif) {
            try {
              db.exec('ALTER TABLE test_drive_bookings ADD COLUMN owner_notification_id INTEGER');
              console.log('✅ Колонка owner_notification_id добавлена в test_drive_bookings');
            } catch (e) {
              console.warn('⚠️ Не удалось добавить owner_notification_id:', e.message);
            }
          }
        }
      } catch (tdbErr) {
        console.warn('⚠️ Не удалось создать таблицу test_drive_bookings:', tdbErr.message);
      }

      // Избранные объекты (лайки) пользователя
      try {
        const favTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='property_favorites'").get();
        if (!favTable) {
          console.log('🔄 Создание таблицы property_favorites...');
          db.exec(`
            CREATE TABLE IF NOT EXISTS property_favorites (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              user_id INTEGER NOT NULL,
              property_id INTEGER NOT NULL,
              property_table TEXT NOT NULL,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              UNIQUE(user_id, property_id, property_table),
              FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_property_favorites_user ON property_favorites(user_id);
            CREATE INDEX IF NOT EXISTS idx_property_favorites_property ON property_favorites(property_id, property_table);
          `);
          console.log('✅ Таблица property_favorites создана');
        }
      } catch (favErr) {
        console.warn('⚠️ Не удалось создать таблицу property_favorites:', favErr.message);
      }

      // Проверяем и добавляем поле auction_minimum_bid в таблицу properties
      try {
        const propertiesTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='properties'").get();
        if (propertiesTable) {
          const pragmaInfo = db.prepare("PRAGMA table_info(properties)").all();
          const hasAuctionMinimumBid = pragmaInfo.some(col => col.name === 'auction_minimum_bid');
          
          if (!hasAuctionMinimumBid) {
            console.log('🔄 Обновление схемы БД: добавляем поле auction_minimum_bid...');
            try {
              db.exec('ALTER TABLE properties ADD COLUMN auction_minimum_bid REAL');
              console.log('✅ Поле auction_minimum_bid добавлено в таблицу properties');
            } catch (migrationError) {
              // Игнорируем ошибки "duplicate column name" (поле уже существует)
              if (!migrationError.message.includes('duplicate column name')) {
                console.warn('⚠️ Не удалось добавить поле auction_minimum_bid:', migrationError.message);
              }
            }
          }
        }
      } catch (auctionBidError) {
        console.warn('⚠️ Не удалось проверить/добавить поле auction_minimum_bid:', auctionBidError.message);
      }

      // Создаем таблицу запросов на покупку, если её нет
      try {
        const purchaseRequestsTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='purchase_requests'").get();
        if (!purchaseRequestsTable) {
          console.log('🔄 Создание таблицы запросов на покупку...');
          try {
            const purchaseRequestsSql = readFileSync(join(__dirname, 'create_purchase_requests.sql'), 'utf8');
            db.exec(purchaseRequestsSql);
            console.log('✅ Таблица запросов на покупку создана');
          } catch (sqlError) {
            // Если файл не найден, создаем таблицу напрямую
            if (sqlError.code === 'ENOENT') {
              console.log('⚠️ Файл create_purchase_requests.sql не найден, создаю таблицу напрямую...');
              db.exec(`
                CREATE TABLE IF NOT EXISTS purchase_requests (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  buyer_id TEXT,
                  buyer_name TEXT NOT NULL,
                  buyer_email TEXT,
                  buyer_phone TEXT,
                  seller_id TEXT,
                  seller_name TEXT,
                  seller_email TEXT,
                  seller_phone TEXT,
                  property_id INTEGER,
                  property_title TEXT NOT NULL,
                  property_description TEXT,
                  property_price REAL,
                  property_currency TEXT DEFAULT 'USD',
                  property_location TEXT,
                  property_type TEXT,
                  property_area TEXT,
                  property_rooms INTEGER,
                  property_bedrooms INTEGER,
                  property_bathrooms INTEGER,
                  property_floor INTEGER,
                  property_total_floors INTEGER,
                  property_year_built INTEGER,
                  property_living_area TEXT,
                  property_land_area TEXT,
                  property_building_type TEXT,
                  property_renovation TEXT,
                  property_condition TEXT,
                  property_heating TEXT,
                  property_water_supply TEXT,
                  property_sewerage TEXT,
                  property_balcony INTEGER DEFAULT 0,
                  property_parking INTEGER DEFAULT 0,
                  property_elevator INTEGER DEFAULT 0,
                  property_garage INTEGER DEFAULT 0,
                  property_pool INTEGER DEFAULT 0,
                  property_garden INTEGER DEFAULT 0,
                  property_electricity INTEGER DEFAULT 0,
                  property_internet INTEGER DEFAULT 0,
                  property_security INTEGER DEFAULT 0,
                  property_furniture INTEGER DEFAULT 0,
                  property_commercial_type TEXT,
                  property_business_hours TEXT,
                  request_date TEXT NOT NULL,
                  status TEXT DEFAULT 'pending',
                  admin_notes TEXT,
                  created_at TEXT DEFAULT (datetime('now')),
                  updated_at TEXT DEFAULT (datetime('now'))
                );
                CREATE INDEX IF NOT EXISTS idx_purchase_requests_buyer_id ON purchase_requests(buyer_id);
                CREATE INDEX IF NOT EXISTS idx_purchase_requests_seller_id ON purchase_requests(seller_id);
                CREATE INDEX IF NOT EXISTS idx_purchase_requests_property_id ON purchase_requests(property_id);
                CREATE INDEX IF NOT EXISTS idx_purchase_requests_status ON purchase_requests(status);
                CREATE INDEX IF NOT EXISTS idx_purchase_requests_created_at ON purchase_requests(created_at);
                CREATE TRIGGER IF NOT EXISTS update_purchase_requests_timestamp 
                AFTER UPDATE ON purchase_requests
                BEGIN
                  UPDATE purchase_requests SET updated_at = datetime('now') WHERE id = NEW.id;
                END;
              `);
              console.log('✅ Таблица запросов на покупку создана напрямую');
            } else {
              throw sqlError;
            }
          }
        } else {
          // Таблица существует, проверяем и добавляем недостающие поля
          const pragmaInfo = db.prepare("PRAGMA table_info(purchase_requests)").all();
          const columnNames = pragmaInfo.map(col => col.name);
          
          // Список всех полей, которые должны быть
          const allFields = [
            { name: 'seller_id', type: 'TEXT' },
            { name: 'seller_name', type: 'TEXT' },
            { name: 'seller_email', type: 'TEXT' },
            { name: 'seller_phone', type: 'TEXT' },
            { name: 'property_description', type: 'TEXT' },
            { name: 'property_rooms', type: 'INTEGER' },
            { name: 'property_bedrooms', type: 'INTEGER' },
            { name: 'property_bathrooms', type: 'INTEGER' },
            { name: 'property_floor', type: 'INTEGER' },
            { name: 'property_total_floors', type: 'INTEGER' },
            { name: 'property_year_built', type: 'INTEGER' },
            { name: 'property_living_area', type: 'TEXT' },
            { name: 'property_land_area', type: 'TEXT' },
            { name: 'property_building_type', type: 'TEXT' },
            { name: 'property_renovation', type: 'TEXT' },
            { name: 'property_condition', type: 'TEXT' },
            { name: 'property_heating', type: 'TEXT' },
            { name: 'property_water_supply', type: 'TEXT' },
            { name: 'property_sewerage', type: 'TEXT' },
            { name: 'property_balcony', type: 'INTEGER' },
            { name: 'property_parking', type: 'INTEGER' },
            { name: 'property_elevator', type: 'INTEGER' },
            { name: 'property_garage', type: 'INTEGER' },
            { name: 'property_pool', type: 'INTEGER' },
            { name: 'property_garden', type: 'INTEGER' },
            { name: 'property_electricity', type: 'INTEGER' },
            { name: 'property_internet', type: 'INTEGER' },
            { name: 'property_security', type: 'INTEGER' },
            { name: 'property_furniture', type: 'INTEGER' },
            { name: 'property_commercial_type', type: 'TEXT' },
            { name: 'property_business_hours', type: 'TEXT' }
          ];
          
          for (const field of allFields) {
            if (!columnNames.includes(field.name)) {
              try {
                db.exec(`ALTER TABLE purchase_requests ADD COLUMN ${field.name} ${field.type}`);
                console.log(`✅ Добавлено поле ${field.name} в таблицу purchase_requests`);
              } catch (alterError) {
                if (alterError.message.includes('duplicate column name')) {
                  console.log(`⚠️ Поле ${field.name} уже существует`);
                } else {
                  console.warn(`⚠️ Не удалось добавить поле ${field.name}:`, alterError.message);
                }
              }
            }
          }
          
          // Создаем индекс для seller_id, если его нет
          try {
            db.exec('CREATE INDEX IF NOT EXISTS idx_purchase_requests_seller_id ON purchase_requests(seller_id)');
          } catch (indexError) {
            if (!indexError.message.includes('already exists')) {
              console.warn('⚠️ Не удалось создать индекс idx_purchase_requests_seller_id:', indexError.message);
            }
          }
        }
      } catch (purchaseRequestsError) {
        console.warn('⚠️ Не удалось создать/обновить таблицу запросов на покупку:', purchaseRequestsError.message);
      }

      // Таблица заявок на бонусные задания (пользователь присылает ссылку, админ проверяет вручную)
      try {
        const bonusTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='bonus_task_submissions'").get();
        if (!bonusTable) {
          console.log('🔄 Создание таблицы bonus_task_submissions...');
          db.exec(`
            CREATE TABLE IF NOT EXISTS bonus_task_submissions (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              user_id INTEGER NOT NULL,
              task_id INTEGER NOT NULL,
              link TEXT NOT NULL,
              status TEXT NOT NULL DEFAULT 'pending',
              promo_code TEXT,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              reviewed_at DATETIME,
              used_at DATETIME,
              FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_bonus_submissions_user_id ON bonus_task_submissions(user_id);
            CREATE INDEX IF NOT EXISTS idx_bonus_submissions_status ON bonus_task_submissions(status);
            CREATE INDEX IF NOT EXISTS idx_bonus_submissions_task_id ON bonus_task_submissions(task_id);
          `);
          console.log('✅ Таблица bonus_task_submissions создана');
        }
        // Добавляем колонку used_at если её нет (для существующих БД)
        try {
          const info = db.prepare('PRAGMA table_info(bonus_task_submissions)').all();
          if (info && !info.some((c) => c.name === 'used_at')) {
            db.exec('ALTER TABLE bonus_task_submissions ADD COLUMN used_at DATETIME');
            console.log('✅ Добавлена колонка used_at в bonus_task_submissions');
          }
        } catch (alterErr) {
          console.warn('⚠️ bonus_task_submissions used_at:', alterErr.message);
        }
      } catch (bonusErr) {
        console.warn('⚠️ Не удалось создать таблицу bonus_task_submissions:', bonusErr.message);
      }

      // Таблица лидов умного помощника (чат с ботом)
      try {
        const assistantLeadsTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='assistant_leads'").get();
        if (!assistantLeadsTable) {
          console.log('🔄 Создание таблицы assistant_leads...');
          db.exec(`
            CREATE TABLE IF NOT EXISTS assistant_leads (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              session_id TEXT UNIQUE NOT NULL,
              user_id INTEGER,
              messages TEXT,
              preferences TEXT,
              summary TEXT,
              lead_type TEXT DEFAULT 'cold',
              email TEXT,
              phone TEXT,
              country TEXT,
              region TEXT,
              property_type TEXT,
              created_at TEXT DEFAULT (datetime('now')),
              updated_at TEXT DEFAULT (datetime('now')),
              FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
            );
            CREATE INDEX IF NOT EXISTS idx_assistant_leads_session_id ON assistant_leads(session_id);
            CREATE INDEX IF NOT EXISTS idx_assistant_leads_lead_type ON assistant_leads(lead_type);
            CREATE INDEX IF NOT EXISTS idx_assistant_leads_updated_at ON assistant_leads(updated_at);
          `);
          console.log('✅ Таблица assistant_leads создана');
        }
      } catch (assistantLeadsError) {
        console.warn('⚠️ Не удалось создать таблицу assistant_leads:', assistantLeadsError.message);
      }
      
      // Создаем таблицы для квартир/апартаментов и домов/вилл
      try {
        const apartmentsTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='properties_apartments'").get();
        if (!apartmentsTable) {
          console.log('📋 Создаем таблицу properties_apartments...');
          const sqlPath = join(__dirname, 'create_separate_property_tables.sql');
          if (existsSync(sqlPath)) {
            const sql = readFileSync(sqlPath, 'utf8');
            // Выполняем только CREATE TABLE для apartments
            const apartmentsSQL = sql.split('-- ============================================')[0] + sql.split('-- ============================================')[1].split('-- ============================================')[0];
            db.exec(apartmentsSQL);
          } else {
            // Если файл не найден, создаем таблицу напрямую
            db.exec(`
              CREATE TABLE IF NOT EXISTS properties_apartments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                property_type TEXT NOT NULL CHECK(property_type IN ('apartment', 'commercial')),
                title TEXT NOT NULL,
                description TEXT,
                price REAL,
                currency TEXT DEFAULT 'USD',
                is_auction INTEGER DEFAULT 0,
                auction_start_date TEXT,
                auction_end_date TEXT,
                auction_starting_price REAL,
                area REAL,
                living_area REAL,
                building_type TEXT,
                rooms INTEGER,
                bathrooms INTEGER,
                floor INTEGER,
                total_floors INTEGER,
                year_built INTEGER,
                location TEXT,
                address TEXT,
                apartment TEXT,
                country TEXT,
                city TEXT,
                coordinates TEXT,
                amenities TEXT,
                renovation TEXT,
                condition TEXT,
                heating TEXT,
                water_supply TEXT,
                sewerage TEXT,
                balcony INTEGER DEFAULT 0,
                parking INTEGER DEFAULT 0,
                elevator INTEGER DEFAULT 0,
                electricity INTEGER DEFAULT 0,
                internet INTEGER DEFAULT 0,
                security INTEGER DEFAULT 0,
                furniture INTEGER DEFAULT 0,
                commercial_type TEXT,
                business_hours TEXT,
                additional_amenities TEXT,
                photos TEXT,
                videos TEXT,
                additional_documents TEXT,
                ownership_document TEXT,
                no_debts_document TEXT,
                test_drive INTEGER DEFAULT 0,
                test_drive_data TEXT,
                moderation_status TEXT DEFAULT 'pending',
                reviewed_by TEXT,
                reviewed_at TEXT,
                rejection_reason TEXT,
                is_shared_ownership INTEGER DEFAULT 0,
                total_shares INTEGER,
                shares_sold INTEGER DEFAULT 0,
                reserved_until TEXT,
                reserved_by INTEGER,
                purchase_request_id INTEGER,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
              );
              CREATE INDEX IF NOT EXISTS idx_apartments_user_id ON properties_apartments(user_id);
              CREATE INDEX IF NOT EXISTS idx_apartments_moderation_status ON properties_apartments(moderation_status);
              CREATE INDEX IF NOT EXISTS idx_apartments_property_type ON properties_apartments(property_type);
              CREATE INDEX IF NOT EXISTS idx_apartments_user_status ON properties_apartments(user_id, moderation_status);
              CREATE INDEX IF NOT EXISTS idx_apartments_city ON properties_apartments(city);
              CREATE INDEX IF NOT EXISTS idx_apartments_country ON properties_apartments(country);
            `);
          }
          console.log('✅ Таблица properties_apartments создана');
        } else {
          // Проверяем и добавляем недостающие поля
          const apartmentsPragma = db.prepare("PRAGMA table_info(properties_apartments)").all();
          const existingFields = apartmentsPragma.map(f => f.name);
          const requiredFields = {
            'reserved_until': 'TEXT',
            'reserved_by': 'INTEGER',
            'purchase_request_id': 'INTEGER',
            'is_shared_ownership': 'INTEGER DEFAULT 0',
            'total_shares': 'INTEGER',
            'shares_sold': 'INTEGER DEFAULT 0',
            'sale_type': 'TEXT',
            'is_debt': 'INTEGER DEFAULT 0',
            'has_debt': 'INTEGER DEFAULT 0',
            // Детализация долгов
            'debt_utilities': 'INTEGER DEFAULT 0',
            'debt_mortgage_pledge': 'INTEGER DEFAULT 0',
            'debt_property_taxes': 'INTEGER DEFAULT 0',
            'debt_arrest': 'INTEGER DEFAULT 0',
            'debt_inherited': 'INTEGER DEFAULT 0',
            'debt_third_party': 'INTEGER DEFAULT 0',
            'debt_other': 'TEXT',
            'debt_amount': 'REAL',
            'debt_severity': 'TEXT'
          };
          
          for (const [fieldName, fieldType] of Object.entries(requiredFields)) {
            if (!existingFields.includes(fieldName)) {
              try {
                db.exec(`ALTER TABLE properties_apartments ADD COLUMN ${fieldName} ${fieldType}`);
                console.log(`✅ Добавлено поле ${fieldName} в properties_apartments`);
              } catch (alterError) {
                console.warn(`⚠️ Не удалось добавить поле ${fieldName}:`, alterError.message);
              }
            }
          }
        }
        
        const housesTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='properties_houses'").get();
        if (!housesTable) {
          console.log('📋 Создаем таблицу properties_houses...');
          db.exec(`
            CREATE TABLE IF NOT EXISTS properties_houses (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              user_id INTEGER NOT NULL,
              property_type TEXT NOT NULL CHECK(property_type IN ('house', 'villa')),
              title TEXT NOT NULL,
              description TEXT,
              price REAL,
              currency TEXT DEFAULT 'USD',
              is_auction INTEGER DEFAULT 0,
              auction_start_date TEXT,
              auction_end_date TEXT,
              auction_starting_price REAL,
              area REAL,
              living_area REAL,
              land_area REAL,
              building_type TEXT,
              bedrooms INTEGER,
              bathrooms INTEGER,
              floors INTEGER,
              year_built INTEGER,
              location TEXT,
              address TEXT,
              country TEXT,
              city TEXT,
              coordinates TEXT,
              amenities TEXT,
              renovation TEXT,
              condition TEXT,
              heating TEXT,
              water_supply TEXT,
              sewerage TEXT,
              pool INTEGER DEFAULT 0,
              garden INTEGER DEFAULT 0,
              garage INTEGER DEFAULT 0,
              parking INTEGER DEFAULT 0,
              electricity INTEGER DEFAULT 0,
              internet INTEGER DEFAULT 0,
              security INTEGER DEFAULT 0,
              furniture INTEGER DEFAULT 0,
              additional_amenities TEXT,
              photos TEXT,
              videos TEXT,
              additional_documents TEXT,
              ownership_document TEXT,
              no_debts_document TEXT,
              test_drive INTEGER DEFAULT 0,
              test_drive_data TEXT,
              moderation_status TEXT DEFAULT 'pending',
              reviewed_by TEXT,
              reviewed_at TEXT,
              rejection_reason TEXT,
              is_shared_ownership INTEGER DEFAULT 0,
              total_shares INTEGER,
              shares_sold INTEGER DEFAULT 0,
              sale_type TEXT,
              is_debt INTEGER DEFAULT 0,
              has_debt INTEGER DEFAULT 0,
              debt_utilities INTEGER DEFAULT 0,
              debt_mortgage_pledge INTEGER DEFAULT 0,
              debt_property_taxes INTEGER DEFAULT 0,
              debt_arrest INTEGER DEFAULT 0,
              debt_inherited INTEGER DEFAULT 0,
              debt_third_party INTEGER DEFAULT 0,
              debt_other TEXT,
              debt_amount REAL,
              reserved_until TEXT,
              reserved_by INTEGER,
              purchase_request_id INTEGER,
              created_at TEXT DEFAULT (datetime('now')),
              updated_at TEXT DEFAULT (datetime('now')),
              FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_houses_user_id ON properties_houses(user_id);
            CREATE INDEX IF NOT EXISTS idx_houses_moderation_status ON properties_houses(moderation_status);
            CREATE INDEX IF NOT EXISTS idx_houses_property_type ON properties_houses(property_type);
            CREATE INDEX IF NOT EXISTS idx_houses_user_status ON properties_houses(user_id, moderation_status);
            CREATE INDEX IF NOT EXISTS idx_houses_city ON properties_houses(city);
            CREATE INDEX IF NOT EXISTS idx_houses_country ON properties_houses(country);
          `);
          console.log('✅ Таблица properties_houses создана');
        } else {
          // Проверяем и добавляем недостающие поля
          const housesPragma = db.prepare("PRAGMA table_info(properties_houses)").all();
          const existingFields = housesPragma.map(f => f.name);
          const requiredFields = {
            'reserved_until': 'TEXT',
            'reserved_by': 'INTEGER',
            'purchase_request_id': 'INTEGER',
            'is_shared_ownership': 'INTEGER DEFAULT 0',
            'total_shares': 'INTEGER',
            'shares_sold': 'INTEGER DEFAULT 0',
            'sale_type': 'TEXT',
            'is_debt': 'INTEGER DEFAULT 0',
            'has_debt': 'INTEGER DEFAULT 0',
            // Детализация долгов
            'debt_utilities': 'INTEGER DEFAULT 0',
            'debt_mortgage_pledge': 'INTEGER DEFAULT 0',
            'debt_property_taxes': 'INTEGER DEFAULT 0',
            'debt_arrest': 'INTEGER DEFAULT 0',
            'debt_inherited': 'INTEGER DEFAULT 0',
            'debt_third_party': 'INTEGER DEFAULT 0',
            'debt_other': 'TEXT',
            'debt_amount': 'REAL',
            'debt_severity': 'TEXT'
          };
          
          for (const [fieldName, fieldType] of Object.entries(requiredFields)) {
            if (!existingFields.includes(fieldName)) {
              try {
                db.exec(`ALTER TABLE properties_houses ADD COLUMN ${fieldName} ${fieldType}`);
                console.log(`✅ Добавлено поле ${fieldName} в properties_houses`);
              } catch (alterError) {
                console.warn(`⚠️ Не удалось добавить поле ${fieldName}:`, alterError.message);
              }
            }
          }
        }
        
        // Создаем таблицу property_shares, если её нет
        try {
          const sharesTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='property_shares'").get();
          if (!sharesTable) {
            db.exec(`
              CREATE TABLE IF NOT EXISTS property_shares (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                property_id INTEGER NOT NULL,
                property_type TEXT NOT NULL CHECK(property_type IN ('apartment', 'commercial', 'house', 'villa')),
                buyer_id INTEGER NOT NULL,
                shares_count INTEGER NOT NULL,
                price_per_share REAL NOT NULL,
                total_price REAL NOT NULL,
                currency TEXT DEFAULT 'USD',
                purchase_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                status TEXT DEFAULT 'completed',
                FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE
              );
              CREATE INDEX IF NOT EXISTS idx_shares_property ON property_shares(property_id, property_type);
              CREATE INDEX IF NOT EXISTS idx_shares_buyer ON property_shares(buyer_id);
              CREATE INDEX IF NOT EXISTS idx_shares_status ON property_shares(status);
              CREATE INDEX IF NOT EXISTS idx_shares_property_buyer ON property_shares(property_id, property_type, buyer_id);
            `);
            console.log('✅ Таблица property_shares создана');
          }
        } catch (sharesError) {
          console.warn('⚠️ Не удалось создать таблицу property_shares:', sharesError.message);
        }
      } catch (propertiesTablesError) {
        console.error('❌ Не удалось создать/обновить таблицы недвижимости:', propertiesTablesError.message);
        console.error('❌ Stack:', propertiesTablesError.stack);
        // Пытаемся создать таблицу напрямую в случае ошибки
        try {
          console.log('🔄 Попытка создать таблицу properties_apartments напрямую...');
          db.exec(`
            CREATE TABLE IF NOT EXISTS properties_apartments (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              user_id INTEGER NOT NULL,
              property_type TEXT NOT NULL CHECK(property_type IN ('apartment', 'commercial')),
              title TEXT NOT NULL,
              description TEXT,
              price REAL,
              currency TEXT DEFAULT 'USD',
              is_auction INTEGER DEFAULT 0,
              auction_start_date TEXT,
              auction_end_date TEXT,
              auction_starting_price REAL,
              area REAL,
              living_area REAL,
              building_type TEXT,
              rooms INTEGER,
              bathrooms INTEGER,
              floor INTEGER,
              total_floors INTEGER,
              year_built INTEGER,
              location TEXT,
              address TEXT,
              apartment TEXT,
              country TEXT,
              city TEXT,
              coordinates TEXT,
              amenities TEXT,
              renovation TEXT,
              condition TEXT,
              heating TEXT,
              water_supply TEXT,
              sewerage TEXT,
              balcony INTEGER DEFAULT 0,
              parking INTEGER DEFAULT 0,
              elevator INTEGER DEFAULT 0,
              electricity INTEGER DEFAULT 0,
              internet INTEGER DEFAULT 0,
              security INTEGER DEFAULT 0,
              furniture INTEGER DEFAULT 0,
              commercial_type TEXT,
              business_hours TEXT,
              additional_amenities TEXT,
              photos TEXT,
              videos TEXT,
              additional_documents TEXT,
              ownership_document TEXT,
              no_debts_document TEXT,
              test_drive INTEGER DEFAULT 0,
              test_drive_data TEXT,
              moderation_status TEXT DEFAULT 'pending',
              reviewed_by TEXT,
              reviewed_at TEXT,
              rejection_reason TEXT,
              is_shared_ownership INTEGER DEFAULT 0,
              total_shares INTEGER,
              shares_sold INTEGER DEFAULT 0,
              sale_type TEXT,
              is_debt INTEGER DEFAULT 0,
              has_debt INTEGER DEFAULT 0,
              debt_utilities INTEGER DEFAULT 0,
              debt_mortgage_pledge INTEGER DEFAULT 0,
              debt_property_taxes INTEGER DEFAULT 0,
              debt_arrest INTEGER DEFAULT 0,
              debt_inherited INTEGER DEFAULT 0,
              debt_other TEXT,
              debt_amount REAL,
              reserved_until TEXT,
              reserved_by INTEGER,
              purchase_request_id INTEGER,
              created_at TEXT DEFAULT (datetime('now')),
              updated_at TEXT DEFAULT (datetime('now')),
              FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_apartments_user_id ON properties_apartments(user_id);
            CREATE INDEX IF NOT EXISTS idx_apartments_moderation_status ON properties_apartments(moderation_status);
            CREATE INDEX IF NOT EXISTS idx_apartments_property_type ON properties_apartments(property_type);
            CREATE INDEX IF NOT EXISTS idx_apartments_user_status ON properties_apartments(user_id, moderation_status);
            CREATE INDEX IF NOT EXISTS idx_apartments_city ON properties_apartments(city);
            CREATE INDEX IF NOT EXISTS idx_apartments_country ON properties_apartments(country);
          `);
          console.log('✅ Таблица properties_apartments создана напрямую');
        } catch (fallbackError) {
          console.error('❌ Критическая ошибка: не удалось создать таблицу properties_apartments:', fallbackError.message);
        }
      }
    } catch (migrationError) {
      console.warn('⚠️ Не удалось обновить схему документов:', migrationError.message);
    }

    // Таблица победителей аукционов (одно место создания — без дублирования в server.js)
    try {
      const awTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='auction_winners'").get();
      if (!awTable) {
        console.log('🔄 Создание таблицы auction_winners...');
        db.exec(`
          CREATE TABLE IF NOT EXISTS auction_winners (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            property_id INTEGER NOT NULL,
            property_table TEXT NOT NULL,
            winning_bid_amount REAL NOT NULL,
            currency TEXT DEFAULT 'USD',
            auction_end_date TEXT NOT NULL,
            won_at TEXT DEFAULT (datetime('now')),
            deposit_amount REAL NOT NULL,
            deposit_due_date TEXT NOT NULL,
            deposit_paid INTEGER DEFAULT 0,
            deposit_paid_at TEXT,
            status TEXT DEFAULT 'pending_deposit',
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
          );
          CREATE INDEX IF NOT EXISTS idx_auction_winners_user_id ON auction_winners(user_id);
          CREATE INDEX IF NOT EXISTS idx_auction_winners_property_id ON auction_winners(property_id);
          CREATE INDEX IF NOT EXISTS idx_auction_winners_status ON auction_winners(status);
          CREATE INDEX IF NOT EXISTS idx_auction_winners_deposit_paid ON auction_winners(deposit_paid);
        `);
        console.log('✅ Таблица auction_winners создана');
      }
    } catch (awError) {
      console.warn('⚠️ Не удалось создать таблицу auction_winners:', awError.message);
    }

    // purchase_requests: колонка property_table для связки с таблицей недвижимости
    try {
      const prTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='purchase_requests'").get();
      if (prTable) {
        const prPragma = db.prepare("PRAGMA table_info(purchase_requests)").all();
        if (!prPragma.some(col => col.name === 'property_table')) {
          db.exec('ALTER TABLE purchase_requests ADD COLUMN property_table TEXT');
          db.exec('CREATE INDEX IF NOT EXISTS idx_purchase_requests_property_id_table ON purchase_requests(property_id, property_table)');
          console.log('✅ В purchase_requests добавлена колонка property_table');
        }
      }
    } catch (prError) {
      console.warn('⚠️ Миграция purchase_requests.property_table:', prError.message);
    }

    // Индекс для быстрой выборки непрочитанных уведомлений по пользователю
    try {
      db.exec('CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read)');
    } catch (idxError) {
      if (!idxError.message.includes('already exists')) console.warn('⚠️ Индекс notifications(user_id, is_read):', idxError.message);
    }

    // Таблицы новой схемы ОБЯЗАНЫ существовать: раньше они создавались только внутри try миграции documents —
    // при любой ошибке там блок пропускался, на проде не было properties_apartments / properties_houses.
    try {
      ensureApartmentsTable();
      ensureHousesTable();
      console.log('✅ Таблицы properties_apartments и properties_houses проверены/созданы при init');
    } catch (ensurePropErr) {
      console.error('❌ Критично: не удалось создать таблицы недвижимости при init:', ensurePropErr.message);
    }
    
    // Кэш наличия таблиц недвижимости (один раз при старте — без PRAGMA/sqlite_master в рантайме)
    try {
      schemaCache.properties = !!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='properties'").get();
      schemaCache.properties_apartments = !!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='properties_apartments'").get();
      schemaCache.properties_houses = !!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='properties_houses'").get();
      console.log('✅ Кэш схемы таблиц недвижимости обновлён:', schemaCache);
    } catch (scError) {
      console.warn('⚠️ Кэш схемы:', scError.message);
    }
    
    ensurePropertyAuxSchema(db);

    // Выполняем начальное обслуживание БД
    performMaintenance(db);
    
    // Настраиваем периодическое обслуживание БД (каждые 24 часа)
    // В production можно использовать более сложный планировщик
    if (typeof setInterval !== 'undefined') {
      setInterval(() => {
        performMaintenance(db);
      }, 24 * 60 * 60 * 1000); // 24 часа
      console.log('✅ Периодическое обслуживание БД настроено (каждые 24 часа)');
    }
    
    console.log('✅ База данных успешно инициализирована:', DB_PATH);
    return db;
  } catch (error) {
    console.error('❌ Ошибка при инициализации базы данных:', error.message || error);
    
    // Повреждённая БД: один раз переименовываем и пробуем снова (создастся новая пустая)
    if (isCorruptError(error) && !retryOnce) {
      console.error('❌ Обнаружена поврежденная БД! Переименовываю и пересоздаю с нуля...');
      removeCorruptedDatabase();
      return initDatabase(true);
    }
    
    if (error.message?.includes('locked') || error.code?.includes('SQLITE_BUSY')) {
      console.error('💡 Рекомендация: Убедитесь, что другой процесс не использует БД.');
      console.error('   Закройте другие экземпляры сервера или другие инструменты работы с БД.');
    }
    
    throw error;
  }
}

/**
 * Получить экземпляр базы данных
 * С проверкой работоспособности соединения
 */
export function getDatabase() {
  if (!db) {
    db = initDatabase();
  }
  
  // Убеждаемся, что внешние ключи включены при каждом использовании
  try {
    db.pragma('foreign_keys = ON');
  } catch (error) {
    console.warn('⚠️ Не удалось включить внешние ключи:', error.message);
  }
  
  // Проверяем, что соединение все еще активно
  try {
    // Простая проверка - выполняем простой запрос
    db.prepare('SELECT 1').get();
  } catch (error) {
    // Если БД повреждена, пытаемся восстановить
    if (error.message && error.message.includes('malformed')) {
      console.error('❌ База данных повреждена! Попытка восстановления...');
      try {
        if (db) {
          db.close();
        }
      } catch (closeError) {
        // Игнорируем ошибки закрытия
      }
      
      // Переименовываем поврежденную БД
      const corruptedPath = join(__dirname, '..', 'database.sqlite.corrupted');
      const dbPath = join(__dirname, '..', 'database.sqlite');
      
      try {
        if (existsSync(dbPath)) {
          if (existsSync(corruptedPath)) {
            unlinkSync(corruptedPath);
          }
          renameSync(dbPath, corruptedPath);
          console.log('📦 Поврежденная БД переименована в database.sqlite.corrupted');
        }
      } catch (renameError) {
        console.warn('⚠️ Не удалось переименовать поврежденную БД:', renameError.message);
      }
      
      // Пересоздаем БД
      db = null;
      db = initDatabase();
      console.log('✅ База данных пересоздана');
    } else {
      // Если соединение потеряно по другой причине, пересоздаем его
      console.warn('⚠️ Соединение с БД потеряно, пересоздаю...');
      try {
        db.close();
      } catch (closeError) {
        // Игнорируем ошибки закрытия
      }
      db = initDatabase();
    }
  }
  
  return db;
}

/**
 * Закрыть соединение с базой данных
 * С безопасным завершением всех операций
 */
export function closeDatabase() {
  if (db) {
    try {
      // Выполняем финальное обслуживание перед закрытием
      console.log('🔧 Выполняю финальное обслуживание БД...');
      performMaintenance(db);
      
      // Закрываем соединение
      db.close();
      db = null;
      console.log('✅ Соединение с базой данных закрыто');
    } catch (error) {
      console.error('❌ Ошибка при закрытии БД:', error.message);
      // Всё равно обнуляем переменную
      db = null;
    }
  }
}

/**
 * Выполняет операцию с автоматическим retry при ошибках блокировки
 * Используйте эту функцию для критичных операций
 */
export function executeWithRetry(operation) {
  return withRetry(() => {
    const database = getDatabase();
    return operation(database);
  });
}

/**
 * Генерирует уникальный 5-значный идентификационный номер
 * @returns {string} Уникальный 5-значный номер (от 10000 до 99999)
 */
function generateUniqueUserIdNumber() {
  const db = getDatabase();
  let attempts = 0;
  const maxAttempts = 100;
  
  while (attempts < maxAttempts) {
    // Генерируем случайное 5-значное число (от 10000 до 99999)
    const number = Math.floor(Math.random() * 90000) + 10000;
    const idNumber = number.toString();
    
    // Проверяем, не существует ли уже такой номер
    const existing = db.prepare('SELECT id FROM users WHERE user_id_number = ?').get(idNumber);
    if (!existing) {
      return idNumber;
    }
    
    attempts++;
  }
  
  // Если не удалось сгенерировать за 100 попыток, используем timestamp
  const timestamp = Date.now().toString().slice(-5);
  return timestamp.padStart(5, '0');
}

function normalizeFavoritePropertyTable(raw) {
  if (raw == null || raw === '') return 'properties_apartments';
  const s = String(raw).toLowerCase();
  if (s === 'apartments' || s === 'properties_apartments') return 'properties_apartments';
  if (s === 'houses' || s === 'properties_houses') return 'properties_houses';
  if (s === 'properties') return 'properties';
  return 'properties_apartments';
}

/** Лайки / избранное по объектам недвижимости (user_id + property_id + таблица) */
export const favoriteQueries = {
  normalizePropertyTable: normalizeFavoritePropertyTable,

  listForUser: (userId) => {
    const db = getDatabase();
    const uid = parseInt(userId, 10);
    if (!uid) return [];
    return db
      .prepare('SELECT property_id, property_table FROM property_favorites WHERE user_id = ? ORDER BY created_at DESC')
      .all(uid);
  },

  add: (userId, propertyId, propertyTable) => {
    const db = getDatabase();
    const uid = parseInt(userId, 10);
    const pid = parseInt(propertyId, 10);
    const tbl = normalizeFavoritePropertyTable(propertyTable);
    if (!uid || !pid) return { changes: 0 };
    return db
      .prepare(
        'INSERT OR IGNORE INTO property_favorites (user_id, property_id, property_table) VALUES (?, ?, ?)'
      )
      .run(uid, pid, tbl);
  },

  remove: (userId, propertyId, propertyTable) => {
    const db = getDatabase();
    const uid = parseInt(userId, 10);
    const pid = parseInt(propertyId, 10);
    const tbl = normalizeFavoritePropertyTable(propertyTable);
    if (!uid || !pid) return { changes: 0 };
    return db
      .prepare(
        'DELETE FROM property_favorites WHERE user_id = ? AND property_id = ? AND property_table = ?'
      )
      .run(uid, pid, tbl);
  },
};

// Экспортируем функции для работы с пользователями
export const userQueries = {
  /**
   * Создать нового пользователя
   */
  create: (userData) => {
    const db = getDatabase();
    
    // Проверяем, есть ли поле password в таблице
    const pragmaInfo = db.prepare("PRAGMA table_info(users)").all();
    const hasPasswordColumn = pragmaInfo.some(col => col.name === 'password');
    const hasUserIdNumber = pragmaInfo.some(col => col.name === 'user_id_number');
    
    // Генерируем уникальный идентификационный номер, если он не передан И поле существует в таблице
    if (hasUserIdNumber && !userData.user_id_number) {
      userData.user_id_number = generateUniqueUserIdNumber();
    }
    
    if (hasPasswordColumn) {
      // Таблица имеет поле password
      // Проверяем, есть ли поле is_blocked
      const pragmaInfo = db.prepare("PRAGMA table_info(users)").all();
      const hasIsBlocked = pragmaInfo.some(col => col.name === 'is_blocked');
      
      if (hasIsBlocked) {
        // Формируем список полей в зависимости от наличия user_id_number
        const fields = hasUserIdNumber 
          ? `first_name, last_name, email, password, phone_number,
            passport_series, passport_number, identification_number,
            address, country, passport_photo, user_photo,
            is_verified, role, is_online, is_blocked, user_id_number`
          : `first_name, last_name, email, password, phone_number,
            passport_series, passport_number, identification_number,
            address, country, passport_photo, user_photo,
            is_verified, role, is_online, is_blocked`;
        
        const placeholders = hasUserIdNumber 
          ? '?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?'
          : '?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?';
        
        const stmt = db.prepare(`
          INSERT INTO users (${fields}) VALUES (${placeholders})
        `);
        
        const values = [
          userData.first_name,
          userData.last_name,
          userData.email || null,
          userData.password || null, // Пароль может быть null (для WhatsApp)
          userData.phone_number,
          userData.passport_series || null,
          userData.passport_number || null,
          userData.identification_number || null,
          userData.address || null,
          userData.country || null,
          userData.passport_photo || null,
          userData.user_photo || null,
          userData.is_verified ? 1 : 0,
          userData.role || 'buyer',
          userData.is_online ? 1 : 0,
          userData.is_blocked ? 1 : 0
        ];
        
        if (hasUserIdNumber) {
          values.push(userData.user_id_number);
        }
        
        return stmt.run(...values);
      } else {
        const fields = hasUserIdNumber 
          ? `first_name, last_name, email, password, phone_number,
            passport_series, passport_number, identification_number,
            address, country, passport_photo, user_photo,
            is_verified, role, is_online, user_id_number`
          : `first_name, last_name, email, password, phone_number,
            passport_series, passport_number, identification_number,
            address, country, passport_photo, user_photo,
            is_verified, role, is_online`;
        
        const placeholders = hasUserIdNumber 
          ? '?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?'
          : '?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?';
        
        const stmt = db.prepare(`
          INSERT INTO users (${fields}) VALUES (${placeholders})
        `);
        
        const values = [
          userData.first_name,
          userData.last_name,
          userData.email || null,
          userData.password || null, // Пароль может быть null (для WhatsApp)
          userData.phone_number,
          userData.passport_series || null,
          userData.passport_number || null,
          userData.identification_number || null,
          userData.address || null,
          userData.country || null,
          userData.passport_photo || null,
          userData.user_photo || null,
          userData.is_verified ? 1 : 0,
          userData.role || 'buyer',
          userData.is_online ? 1 : 0
        ];
        
        if (hasUserIdNumber) {
          values.push(userData.user_id_number);
        }
        
        return stmt.run(...values);
      }
    } else {
      // Старая схема без password (для обратной совместимости)
      const fields = hasUserIdNumber 
        ? `first_name, last_name, email, phone_number,
          passport_series, passport_number, identification_number,
          address, country, passport_photo, user_photo,
          is_verified, role, is_online, user_id_number`
        : `first_name, last_name, email, phone_number,
          passport_series, passport_number, identification_number,
          address, country, passport_photo, user_photo,
          is_verified, role, is_online`;
      
      const placeholders = hasUserIdNumber 
        ? '?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?'
        : '?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?';
      
      const stmt = db.prepare(`
        INSERT INTO users (${fields}) VALUES (${placeholders})
      `);
      
      const values = [
        userData.first_name,
        userData.last_name,
        userData.email || null,
        userData.phone_number,
        userData.passport_series || null,
        userData.passport_number || null,
        userData.identification_number || null,
        userData.address || null,
        userData.country || null,
        userData.passport_photo || null,
        userData.user_photo || null,
        userData.is_verified ? 1 : 0,
        userData.role || 'buyer',
        userData.is_online ? 1 : 0
      ];
      
      if (hasUserIdNumber) {
        values.push(userData.user_id_number);
      }
      
      return stmt.run(...values);
    }
  },

  /**
   * Получить пользователя по ID
   */
  getById: (id) => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    return stmt.get(id);
  },

  /**
   * Получить пользователя по email
   */
  getByEmail: (email) => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    return stmt.get(email);
  },

  /**
   * Получить пользователя по номеру телефона
   */
  getByPhone: (phone) => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM users WHERE phone_number = ?');
    return stmt.get(phone);
  },

  /**
   * Получить пользователя по Telegram ID
   */
  getByTelegramId: (telegramId) => {
    const db = getDatabase();
    const pragmaInfo = db.prepare("PRAGMA table_info(users)").all();
    if (!pragmaInfo.some(col => col.name === 'telegram_id')) return null;
    const stmt = db.prepare('SELECT * FROM users WHERE telegram_id = ?');
    return stmt.get(String(telegramId));
  },

  /**
   * Обновить данные пользователя
   */
  update: (id, userData) => {
    const db = getDatabase();
    
    // Проверяем, есть ли поле user_id_number в таблице
    let pragmaInfo = db.prepare("PRAGMA table_info(users)").all();
    let hasUsernameColumn = pragmaInfo.some(col => col.name === 'username');
    if (!hasUsernameColumn) {
      try {
        db.exec('ALTER TABLE users ADD COLUMN username TEXT');
        db.exec('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)');
        pragmaInfo = db.prepare('PRAGMA table_info(users)').all();
        hasUsernameColumn = true;
        console.log('✅ Поле username добавлено в users (миграция из userQueries.update)');
      } catch (e) {
        console.warn('⚠️ Не удалось добавить поле username:', e.message);
        hasUsernameColumn = false;
      }
    }
    const hasUserIdNumber = pragmaInfo.some(col => col.name === 'user_id_number');
    
    // Проверяем поля Telegram — при необходимости добавляем (на случай старой БД без миграции)
    const hasTelegramColumns = pragmaInfo.some(col => col.name === 'telegram_id');
    const needsTelegram = userData.telegram_id != null || userData.telegram_username != null || userData.telegram_photo_url != null;
    if (needsTelegram && !hasTelegramColumns) {
      try {
        db.exec("ALTER TABLE users ADD COLUMN telegram_id TEXT");
        db.exec("ALTER TABLE users ADD COLUMN telegram_username TEXT");
        db.exec("ALTER TABLE users ADD COLUMN telegram_photo_url TEXT");
        db.exec("CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id)");
        console.log('✅ Поля telegram_id, telegram_username, telegram_photo_url добавлены в users');
        pragmaInfo = db.prepare("PRAGMA table_info(users)").all();
      } catch (e) {
        console.warn('⚠️ Не удалось добавить поля Telegram:', e.message);
      }
    }
    const hasTelegramColumnsNow = pragmaInfo.some(col => col.name === 'telegram_id');
    
    // Проверяем, есть ли у пользователя user_id_number (только если поле существует)
    let currentUser = null;
    if (hasUserIdNumber) {
      try {
        currentUser = db.prepare('SELECT user_id_number FROM users WHERE id = ?').get(id);
        if (currentUser && !currentUser.user_id_number && !userData.user_id_number) {
          // Если у пользователя нет user_id_number, генерируем его
          userData.user_id_number = generateUniqueUserIdNumber();
          console.log(`🔄 Генерация user_id_number для пользователя ${id}: ${userData.user_id_number}`);
        }
      } catch (error) {
        console.warn('⚠️ Ошибка при проверке user_id_number:', error.message);
      }
    } else {
      // Если поля нет в таблице, пытаемся добавить его
      console.log('🔄 Поле user_id_number отсутствует в таблице, добавляем...');
      try {
        // Добавляем поле БЕЗ UNIQUE (SQLite не позволяет добавить UNIQUE колонку в таблицу с данными)
        db.exec("ALTER TABLE users ADD COLUMN user_id_number TEXT");
        console.log('✅ Поле user_id_number добавлено в таблицу users');
        // Создаем индекс для быстрого поиска
        db.exec("CREATE INDEX IF NOT EXISTS idx_users_id_number ON users(user_id_number)");
        console.log('✅ Индекс idx_users_id_number создан');
        
        // Теперь проверяем пользователя и генерируем номер, если нужно
        currentUser = db.prepare('SELECT user_id_number FROM users WHERE id = ?').get(id);
        if (currentUser && !currentUser.user_id_number && !userData.user_id_number) {
          userData.user_id_number = generateUniqueUserIdNumber();
          console.log(`🔄 Генерация user_id_number для пользователя ${id}: ${userData.user_id_number}`);
        }
      } catch (addError) {
        console.warn('⚠️ Не удалось добавить поле user_id_number:', addError.message);
      }
    }
    
    const fields = [];
    const values = [];
    
    const allowedFields = [
      'first_name', 'last_name', 'email',
      ...(hasUsernameColumn ? ['username'] : []),
      'password', 'phone_number',
      'passport_series', 'passport_number', 'identification_number',
      'address', 'country', 'passport_photo', 'user_photo',
      'is_verified', 'role', 'is_online', 'is_blocked',
    ];
    if (hasTelegramColumnsNow) {
      allowedFields.push('telegram_id', 'telegram_username', 'telegram_photo_url');
    }
    
    // Добавляем user_id_number в allowedFields только если поле существует в таблице
    if (hasUserIdNumber) {
      allowedFields.push('user_id_number');
    }
    
    Object.keys(userData).forEach(key => {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = ?`);
        if (key === 'is_verified' || key === 'is_online' || key === 'is_blocked') {
          values.push(userData[key] ? 1 : 0);
        } else if (key === 'password') {
          // Пароль может быть пустой строкой, но если передан - сохраняем
          values.push(userData[key] || null);
        } else {
          values.push(userData[key] || null);
        }
      }
    });
    
    // Если fields пустой, но мы сгенерировали user_id_number и поле существует, все равно обновляем
    if (fields.length === 0 && !userData.user_id_number) {
      return { changes: 0 };
    }
    
    // Если fields пустой, но user_id_number был сгенерирован и поле существует, добавляем его
    if (fields.length === 0 && userData.user_id_number && hasUserIdNumber) {
      fields.push('user_id_number = ?');
      values.push(userData.user_id_number);
    }
    
    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    
    const stmt = db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`);
    return stmt.run(...values);
  },

  /**
   * Получить всех пользователей (с пагинацией)
   */
  getAll: (limit = 100, offset = 0) => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?');
    return stmt.all(limit, offset);
  },

  /**
   * Получить количество всех пользователей
   */
  getCount: () => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT COUNT(*) as count FROM users');
    const result = stmt.get();
    return result ? result.count : 0;
  },

  /**
   * Получить пользователей по роли
   */
  getByRole: (role) => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM users WHERE role = ? ORDER BY created_at DESC');
    return stmt.all(role);
  },

  /**
   * Удалить пользователя
   */
  delete: (id) => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM users WHERE id = ?');
    return stmt.run(id);
  },

  /**
   * Получить статистику по странам (национальностям)
   */
  getCountryStats: () => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT 
        COALESCE(country, 'Не указано') as country,
        COUNT(*) as count
      FROM users
      GROUP BY country
      ORDER BY count DESC
    `);
    return stmt.all();
  },

  /**
   * Получить статистику по ролям (продавцы/покупатели)
   */
  getRoleStats: () => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT 
        COALESCE(role, 'buyer') as role,
        COUNT(*) as count
      FROM users
      GROUP BY role
    `);
    return stmt.all();
  },

  /**
   * Получить количество регистраций по дням за период (startDate, endDate — строки YYYY-MM-DD)
   * Возвращает массив { date, count } для каждого дня периода, включая дни с 0 регистраций
   */
  getRegistrationsByDay: (startDate, endDate) => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT date(created_at) as date, COUNT(*) as count
      FROM users
      WHERE date(created_at) >= ? AND date(created_at) <= ?
      GROUP BY date(created_at)
      ORDER BY date
    `);
    const rows = stmt.all(startDate, endDate);
    const countByDate = Object.fromEntries(rows.map(r => [r.date, r.count]));

    const result = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().slice(0, 10);
      result.push({ date: dateStr, count: countByDate[dateStr] || 0 });
    }
    return result;
  }
};

// Экспортируем функции для работы с документами
export const documentQueries = {
  /**
   * Создать новый документ
   */
  create: (documentData) => {
    const db = getDatabase();
    
    // Убеждаемся, что внешние ключи включены
    db.pragma('foreign_keys = ON');
    
    // Преобразуем user_id в число, если это строка
    const userId = typeof documentData.user_id === 'string' 
      ? parseInt(documentData.user_id, 10) 
      : documentData.user_id;
    
    // Проверяем, что user_id валидный
    if (!userId || isNaN(userId) || userId <= 0) {
      throw new Error(`Неверный user_id: ${documentData.user_id}. Ожидается положительное число.`);
    }
    
    // Проверяем, существует ли пользователь с таким ID
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
    if (!user) {
      throw new Error(`Пользователь с ID ${userId} не найден в базе данных. FOREIGN KEY constraint failed.`);
    }
    
    // Проверяем, есть ли поле verification_status в таблице
    const pragmaInfo = db.prepare("PRAGMA table_info(documents)").all();
    const hasVerificationStatus = pragmaInfo.some(col => col.name === 'verification_status');
    
    if (hasVerificationStatus) {
      const stmt = db.prepare(`
        INSERT INTO documents (user_id, document_type, document_photo, is_reviewed, verification_status)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      const verificationStatus = documentData.verification_status || 'pending';
      console.log('💾 Сохранение документа в БД:', {
        user_id: userId,
        document_type: documentData.document_type,
        verification_status: verificationStatus,
        is_reviewed: documentData.is_reviewed ? 1 : 0
      });
      
      const result = stmt.run(
        userId,
        documentData.document_type || null,
        documentData.document_photo,
        documentData.is_reviewed ? 1 : 0,
        verificationStatus
      );
      
      // Проверяем, что документ действительно сохранен с правильным статусом
      const savedDoc = db.prepare('SELECT * FROM documents WHERE id = ?').get(result.lastInsertRowid);
      console.log('✅ Документ сохранен в БД:', {
        id: savedDoc.id,
        verification_status: savedDoc.verification_status,
        is_reviewed: savedDoc.is_reviewed
      });
      
      return result;
    } else {
      // Старая схема без verification_status
      const stmt = db.prepare(`
        INSERT INTO documents (user_id, document_type, document_photo, is_reviewed)
        VALUES (?, ?, ?, ?)
      `);
      
      return stmt.run(
        userId,
        documentData.document_type || null,
        documentData.document_photo,
        documentData.is_reviewed ? 1 : 0
      );
    }
  },

  /**
   * Получить документ по ID
   */
  getById: (id) => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM documents WHERE id = ?');
    return stmt.get(id);
  },

  /**
   * Получить все документы пользователя
   */
  getByUserId: (userId) => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM documents WHERE user_id = ? ORDER BY created_at DESC');
    return stmt.all(userId);
  },

  /**
   * Получить непросмотренные документы
   */
  getUnreviewed: () => {
    const db = getDatabase();
    // Проверяем, есть ли поле verification_status
    const pragmaInfo = db.prepare("PRAGMA table_info(documents)").all();
    const hasVerificationStatus = pragmaInfo.some(col => col.name === 'verification_status');
    
    if (hasVerificationStatus) {
      const stmt = db.prepare(`
        SELECT d.*, u.first_name, u.last_name, u.email, u.phone_number 
        FROM documents d 
        LEFT JOIN users u ON d.user_id = u.id 
        WHERE d.verification_status = 'pending' 
        ORDER BY d.created_at ASC
      `);
      return stmt.all();
    } else {
      const stmt = db.prepare('SELECT * FROM documents WHERE is_reviewed = 0 ORDER BY created_at ASC');
      return stmt.all();
    }
  },
  
  /**
   * Получить документы на верификацию с информацией о пользователе
   * Упрощенная версия - всегда используем verification_status
   */
  getPendingVerification: () => {
    const db = getDatabase();
    
    // Простой и надежный запрос - получаем все документы со статусом 'pending' с информацией о пользователе
    const stmt = db.prepare(`
      SELECT 
        d.id,
        d.user_id,
        d.document_type,
        d.document_photo,
        d.verification_status,
        d.is_reviewed,
        d.reviewed_by,
        d.reviewed_at,
        d.rejection_reason,
        d.created_at,
        u.id as user_db_id,
        u.first_name,
        u.last_name,
        u.email,
        u.phone_number,
        u.role
      FROM documents d 
      INNER JOIN users u ON d.user_id = u.id 
      WHERE d.verification_status = 'pending' 
      ORDER BY d.created_at ASC
    `);
    
    const results = stmt.all();
    
    // Логирование для отладки
    console.log('🔍 getPendingVerification:');
    console.log('  - Найдено документов со статусом pending:', results.length);
    
    if (results.length > 0) {
      console.log('  - Первый документ:', {
        id: results[0].id,
        user_id: results[0].user_id,
        document_type: results[0].document_type,
        verification_status: results[0].verification_status,
        user_name: `${results[0].first_name} ${results[0].last_name}`,
        user_email: results[0].email,
        user_role: results[0].role || 'не указана'
      });
      
      // Логируем роли всех пользователей для диагностики
      const rolesCount = {};
      results.forEach(doc => {
        const role = doc.role || 'не указана';
        rolesCount[role] = (rolesCount[role] || 0) + 1;
      });
      console.log('  - Распределение по ролям:', rolesCount);
    } else {
      // Проверим, есть ли вообще документы в БД
      const allDocsCount = db.prepare('SELECT COUNT(*) as count FROM documents').get();
      const pendingDocsCount = db.prepare("SELECT COUNT(*) as count FROM documents WHERE verification_status = 'pending'").get();
      console.log('  - Всего документов в БД:', allDocsCount.count);
      console.log('  - Документов со статусом pending:', pendingDocsCount.count);
    }
    
    return results;
  },

  /**
   * Получить все документы (с пагинацией)
   */
  getAll: (limit = 100, offset = 0) => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM documents ORDER BY created_at DESC LIMIT ? OFFSET ?');
    return stmt.all(limit, offset);
  },

  /**
   * Отметить документ как просмотренный
   */
  markAsReviewed: (documentId, reviewedBy) => {
    const db = getDatabase();
    const pragmaInfo = db.prepare("PRAGMA table_info(documents)").all();
    const hasVerificationStatus = pragmaInfo.some(col => col.name === 'verification_status');
    
    if (hasVerificationStatus) {
      const stmt = db.prepare(`
        UPDATE documents 
        SET is_reviewed = 1, verification_status = 'approved', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `);
      return stmt.run(reviewedBy, documentId);
    } else {
      const stmt = db.prepare(`
        UPDATE documents 
        SET is_reviewed = 1, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `);
      return stmt.run(reviewedBy, documentId);
    }
  },
  
  /**
   * Одобрить документ (верификация успешна)
   */
  approveDocument: (documentId, reviewedBy) => {
    const db = getDatabase();
    const pragmaInfo = db.prepare("PRAGMA table_info(documents)").all();
    const hasVerificationStatus = pragmaInfo.some(col => col.name === 'verification_status');
    
    if (hasVerificationStatus) {
      const stmt = db.prepare(`
        UPDATE documents 
        SET is_reviewed = 1, verification_status = 'approved', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP, rejection_reason = NULL
        WHERE id = ?
      `);
      return stmt.run(reviewedBy, documentId);
    } else {
      // Fallback для старой схемы
      const stmt = db.prepare(`
        UPDATE documents 
        SET is_reviewed = 1, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `);
      return stmt.run(reviewedBy, documentId);
    }
  },
  
  /**
   * Обновить статус документа (универсальная функция)
   */
  updateStatus: (documentId, status, reviewedBy = null, rejectionReason = null) => {
    const db = getDatabase();
    const pragmaInfo = db.prepare("PRAGMA table_info(documents)").all();
    const hasVerificationStatus = pragmaInfo.some(col => col.name === 'verification_status');
    const hasRejectionReason = pragmaInfo.some(col => col.name === 'rejection_reason');
    
    if (hasVerificationStatus) {
      if (hasRejectionReason) {
        const stmt = db.prepare(`
          UPDATE documents 
          SET is_reviewed = 1, verification_status = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP, rejection_reason = ?
          WHERE id = ?
        `);
        return stmt.run(status, reviewedBy, rejectionReason || null, documentId);
      } else {
        const stmt = db.prepare(`
          UPDATE documents 
          SET is_reviewed = 1, verification_status = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `);
        return stmt.run(status, reviewedBy, documentId);
      }
    } else {
      // Fallback для старой схемы
      const stmt = db.prepare(`
        UPDATE documents 
        SET is_reviewed = 1, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `);
      return stmt.run(reviewedBy, documentId);
    }
  },

  /**
   * Отклонить документ
   */
  rejectDocument: (documentId, reviewedBy, rejectionReason = null) => {
    const db = getDatabase();
    const pragmaInfo = db.prepare("PRAGMA table_info(documents)").all();
    const hasVerificationStatus = pragmaInfo.some(col => col.name === 'verification_status');
    const hasRejectionReason = pragmaInfo.some(col => col.name === 'rejection_reason');
    
    if (hasVerificationStatus) {
      if (hasRejectionReason) {
        const stmt = db.prepare(`
          UPDATE documents 
          SET is_reviewed = 1, verification_status = 'rejected', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP, rejection_reason = ?
          WHERE id = ?
        `);
        return stmt.run(reviewedBy, rejectionReason || null, documentId);
      } else {
        const stmt = db.prepare(`
          UPDATE documents 
          SET is_reviewed = 1, verification_status = 'rejected', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `);
        return stmt.run(reviewedBy, documentId);
      }
    } else {
      // Fallback для старой схемы
      const stmt = db.prepare(`
        UPDATE documents 
        SET is_reviewed = 1, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `);
      return stmt.run(reviewedBy, documentId);
    }
  },

  /**
   * Удалить документ
   */
  delete: (id) => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM documents WHERE id = ?');
    return stmt.run(id);
  }
};

// Экспортируем функции для работы с уведомлениями
export const notificationQueries = {
  /**
   * Создать новое уведомление
   */
  create: (notificationData) => {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO notifications (user_id, type, title, message, data, is_read, view_count)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(
      notificationData.user_id,
      notificationData.type,
      notificationData.title,
      notificationData.message || null,
      notificationData.data ? JSON.stringify(notificationData.data) : null,
      notificationData.is_read ? 1 : 0,
      notificationData.view_count || 0
    );
  },

  /**
   * Получить все уведомления пользователя
   */
  getByUserId: (userId) => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM notifications 
      WHERE user_id = ? 
      ORDER BY created_at DESC
    `);
    return stmt.all(userId);
  },

  /**
   * Получить непрочитанные уведомления пользователя
   */
  getUnreadByUserId: (userId) => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM notifications 
      WHERE user_id = ? AND is_read = 0 
      ORDER BY created_at DESC
    `);
    return stmt.all(userId);
  },

  /**
   * Отметить уведомление как прочитанное и увеличить счетчик просмотров
   * Если просмотрено 2 раза, удаляет уведомление
   */
  markAsViewed: (notificationId) => {
    const db = getDatabase();
    
    // Получаем полную информацию об уведомлении
    const notification = db.prepare('SELECT * FROM notifications WHERE id = ?').get(notificationId);
    if (!notification) {
      return { changes: 0 };
    }
    
    const newViewCount = (notification.view_count || 0) + 1;
    const isRead = 1; // Mark as read after first view
    
    // Если это уведомление о верификации, удаляем его после первого просмотра
    if (notification.type === 'verification_success' && newViewCount >= 1) {
      console.log(`🗑️ Удаление уведомления о верификации ${notificationId} после первого просмотра`);
      db.prepare('DELETE FROM notifications WHERE id = ?').run(notificationId);
      return { changes: 1 };
    }
    
    // Для остальных уведомлений удаляем после 2 просмотров
    if (newViewCount >= 2) {
      console.log(`🗑️ Удаление уведомления ${notificationId} после ${newViewCount} просмотров`);
      db.prepare('DELETE FROM notifications WHERE id = ?').run(notificationId);
      return { changes: 1 };
    }
    
    // Иначе увеличиваем счетчик просмотров и отмечаем как прочитанное
    const stmt = db.prepare(`
      UPDATE notifications 
      SET is_read = ?, view_count = ?
      WHERE id = ?
    `);
    return stmt.run(isRead, newViewCount, notificationId);
  },

  /**
   * Удалить уведомление
   */
  delete: (id) => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM notifications WHERE id = ?');
    return stmt.run(id);
  },

  /**
   * Удалить все уведомления пользователя
   */
  deleteByUserId: (userId) => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM notifications WHERE user_id = ?');
    return stmt.run(userId);
  }
};

/** Бронирования тест-драйва (диапазон дат на объекте) */
export const testDriveBookingQueries = {
  ensureTable: () => {
    const db = getDatabase();
    const tdb = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='test_drive_bookings'").get();
    if (!tdb) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS test_drive_bookings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          property_id INTEGER NOT NULL,
          property_table TEXT NOT NULL DEFAULT 'properties_apartments',
          user_id INTEGER NOT NULL,
          start_date TEXT NOT NULL,
          end_date TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending',
          owner_notification_id INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_tdb_property ON test_drive_bookings(property_id, property_table);
        CREATE INDEX IF NOT EXISTS idx_tdb_user ON test_drive_bookings(user_id);
        CREATE INDEX IF NOT EXISTS idx_tdb_status ON test_drive_bookings(status);
      `);
    }
  },

  create: (row) => {
    const db = getDatabase();
    testDriveBookingQueries.ensureTable();
    const stmt = db.prepare(`
      INSERT INTO test_drive_bookings (property_id, property_table, user_id, start_date, end_date, status, owner_notification_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(
      row.property_id,
      row.property_table,
      row.user_id,
      row.start_date,
      row.end_date,
      row.status || 'pending',
      row.owner_notification_id ?? null
    );
  },

  updateOwnerNotificationId: (bookingId, notificationId) => {
    const db = getDatabase();
    return db.prepare('UPDATE test_drive_bookings SET owner_notification_id = ? WHERE id = ?').run(notificationId, bookingId);
  },

  getById: (id) => {
    const db = getDatabase();
    return db.prepare('SELECT * FROM test_drive_bookings WHERE id = ?').get(id);
  },

  listByUserId: (userId) => {
    const db = getDatabase();
    testDriveBookingQueries.ensureTable();
    return db
      .prepare(
        `SELECT * FROM test_drive_bookings
         WHERE user_id = ?
         ORDER BY created_at DESC`
      )
      .all(userId);
  },

  listActiveForProperty: (propertyId, propertyTable) => {
    const db = getDatabase();
    testDriveBookingQueries.ensureTable();
    return db
      .prepare(
        `SELECT * FROM test_drive_bookings
         WHERE property_id = ? AND property_table = ? AND status IN ('pending','approved')
         ORDER BY start_date ASC`
      )
      .all(propertyId, propertyTable);
  },

  countPendingForUserProperty: (userId, propertyId, propertyTable) => {
    const db = getDatabase();
    testDriveBookingQueries.ensureTable();
    const r = db
      .prepare(
        `SELECT COUNT(*) as c FROM test_drive_bookings
         WHERE user_id = ? AND property_id = ? AND property_table = ? AND status = 'pending'`
      )
      .get(userId, propertyId, propertyTable);
    return r ? r.c : 0;
  },

  updateStatus: (id, status) => {
    const db = getDatabase();
    return db.prepare('UPDATE test_drive_bookings SET status = ? WHERE id = ?').run(status, id);
  }
};

// ========== ФУНКЦИИ ДЛЯ РАБОТЫ С АДМИНИСТРАТОРАМИ ==========

export const administratorQueries = {
  /**
   * Создать нового администратора
   */
  create: (adminData) => {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO administrators (
        username, password, email, full_name, is_super_admin,
        can_access_statistics, can_access_users, can_access_moderation,
        can_access_chat, can_access_objects, can_access_access_management,
        created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(
      adminData.username,
      adminData.password,
      adminData.email || null,
      adminData.full_name || null,
      adminData.is_super_admin ? 1 : 0,
      adminData.can_access_statistics ? 1 : 0,
      adminData.can_access_users ? 1 : 0,
      adminData.can_access_moderation ? 1 : 0,
      adminData.can_access_chat ? 1 : 0,
      adminData.can_access_objects ? 1 : 0,
      adminData.can_access_access_management ? 1 : 0,
      adminData.created_by || null
    );
  },

  /**
   * Получить администратора по ID
   */
  getById: (id) => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM administrators WHERE id = ?');
    const admin = stmt.get(id);
    if (!admin) return null;
    
    return {
      ...admin,
      is_super_admin: admin.is_super_admin === 1,
      can_access_statistics: admin.can_access_statistics === 1,
      can_access_users: admin.can_access_users === 1,
      can_access_moderation: admin.can_access_moderation === 1,
      can_access_chat: admin.can_access_chat === 1,
      can_access_objects: admin.can_access_objects === 1,
      can_access_access_management: admin.can_access_access_management === 1
    };
  },

  /**
   * Получить администратора по username
   */
  getByUsername: (username) => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM administrators WHERE username = ?');
    const admin = stmt.get(username);
    if (!admin) return null;
    
    return {
      ...admin,
      is_super_admin: admin.is_super_admin === 1,
      can_access_statistics: admin.can_access_statistics === 1,
      can_access_users: admin.can_access_users === 1,
      can_access_moderation: admin.can_access_moderation === 1,
      can_access_chat: admin.can_access_chat === 1,
      can_access_objects: admin.can_access_objects === 1,
      can_access_access_management: admin.can_access_access_management === 1
    };
  },

  /**
   * Получить администратора по email (без учета регистра)
   */
  getByEmail: (email) => {
    const db = getDatabase();
    // Используем LOWER() для сравнения email без учета регистра
    const stmt = db.prepare('SELECT * FROM administrators WHERE LOWER(email) = LOWER(?)');
    const admin = stmt.get(email);
    if (!admin) return null;
    
    return {
      ...admin,
      is_super_admin: admin.is_super_admin === 1,
      can_access_statistics: admin.can_access_statistics === 1,
      can_access_users: admin.can_access_users === 1,
      can_access_moderation: admin.can_access_moderation === 1,
      can_access_chat: admin.can_access_chat === 1,
      can_access_objects: admin.can_access_objects === 1,
      can_access_access_management: admin.can_access_access_management === 1
    };
  },

  /**
   * Получить всех администраторов
   */
  getAll: () => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM administrators ORDER BY created_at DESC');
    const admins = stmt.all();
    
    return admins.map(admin => ({
      ...admin,
      is_super_admin: admin.is_super_admin === 1,
      can_access_statistics: admin.can_access_statistics === 1,
      can_access_users: admin.can_access_users === 1,
      can_access_moderation: admin.can_access_moderation === 1,
      can_access_chat: admin.can_access_chat === 1,
      can_access_objects: admin.can_access_objects === 1,
      can_access_access_management: admin.can_access_access_management === 1
    }));
  },

  /**
   * Обновить администратора
   */
  update: (id, adminData) => {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE administrators SET
        email = ?,
        full_name = ?,
        can_access_statistics = ?,
        can_access_users = ?,
        can_access_moderation = ?,
        can_access_chat = ?,
        can_access_objects = ?,
        can_access_access_management = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    return stmt.run(
      adminData.email || null,
      adminData.full_name || null,
      adminData.can_access_statistics ? 1 : 0,
      adminData.can_access_users ? 1 : 0,
      adminData.can_access_moderation ? 1 : 0,
      adminData.can_access_chat ? 1 : 0,
      adminData.can_access_objects ? 1 : 0,
      adminData.can_access_access_management ? 1 : 0,
      id
    );
  },

  /**
   * Обновить пароль администратора
   */
  updatePassword: (id, hashedPassword) => {
    const db = getDatabase();
    const stmt = db.prepare('UPDATE administrators SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    return stmt.run(hashedPassword, id);
  },

  /**
   * Удалить администратора
   */
  delete: (id) => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM administrators WHERE id = ?');
    return stmt.run(id);
  }
};

// ========== ФУНКЦИИ ДЛЯ РАБОТЫ С ПРИЧИНАМИ ДОЛГА ==========

export const debtReasonQueries = {
  getAll: () => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM debt_reasons ORDER BY sort_order ASC, id ASC');
    return stmt.all();
  },

  getById: (id) => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM debt_reasons WHERE id = ?');
    return stmt.get(id);
  },

  create: (data) => {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO debt_reasons (title_ru, code, sort_order)
      VALUES (?, ?, ?)
    `);
    const result = stmt.run(
      data.title_ru || '',
      data.code || null,
      data.sort_order != null ? data.sort_order : 0
    );
    return { id: result.lastInsertRowid, changes: result.changes };
  },

  update: (id, data) => {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE debt_reasons SET
        title_ru = ?,
        code = ?,
        sort_order = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    return stmt.run(
      data.title_ru || '',
      data.code || null,
      data.sort_order != null ? data.sort_order : 0,
      id
    );
  },

  delete: (id) => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM debt_reasons WHERE id = ?');
    return stmt.run(id);
  }
};

// ========== ДОКУМЕНТЫ ПО ДОЛГУ (НЕОБХОДИМЫЕ ДОКУМЕНТЫ ПРИ ПРОДАЖЕ ДОЛГА) ==========

export const debtDocumentQueries = {
  getByProperty: (propertyId, propertyType) => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM property_debt_documents WHERE property_id = ? AND property_type = ? ORDER BY document_type');
    return stmt.all(propertyId, propertyType);
  },

  insert: (propertyId, propertyType, documentType, filePath, originalName) => {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO property_debt_documents (property_id, property_type, document_type, file_path, original_name)
      VALUES (?, ?, ?, ?, ?)
    `);
    return stmt.run(propertyId, propertyType, documentType, filePath, originalName || null);
  },

  deleteByProperty: (propertyId, propertyType) => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM property_debt_documents WHERE property_id = ? AND property_type = ?');
    return stmt.run(propertyId, propertyType);
  }
};

// ========== ФУНКЦИИ ДЛЯ РАБОТЫ С WHATSAPP ПОЛЬЗОВАТЕЛЯМИ ==========

export const whatsappUserQueries = {
  /**
   * Создать или обновить WhatsApp пользователя
   */
  createOrUpdate: (userData) => {
    const db = getDatabase();
    
    // Проверяем, существует ли пользователь
    const existing = db.prepare('SELECT * FROM whatsapp_users WHERE phone_number = ?').get(userData.phone_number);
    
    if (existing) {
      // Обновляем существующего пользователя
      // ВАЖНО: Если язык уже был определен ранее (не 'ru' по умолчанию), сохраняем его
      // Обновляем язык только если передан новый язык И существующий язык был 'ru' (по умолчанию)
      const existingLanguage = existing.language || 'ru';
      const newLanguage = userData.language || 'ru';
      
      // Если существующий язык не 'ru' (был определен ранее), сохраняем его
      // Если существующий язык 'ru' и передан новый язык, обновляем
      const languageToSave = (existingLanguage !== 'ru') 
        ? existingLanguage  // Сохраняем существующий определенный язык
        : newLanguage;      // Или используем новый, если существующий был 'ru'
      
      const stmt = db.prepare(`
        UPDATE whatsapp_users SET
          phone_number_clean = COALESCE(?, phone_number_clean),
          first_name = COALESCE(?, first_name),
          last_name = COALESCE(?, last_name),
          country = COALESCE(?, country),
          language = ?,
          last_message_at = CURRENT_TIMESTAMP,
          message_count = message_count + 1,
          updated_at = CURRENT_TIMESTAMP
        WHERE phone_number = ?
      `);
      
      console.log(`🔄 Обновление пользователя ${userData.phone_number}: существующий язык=${existingLanguage}, новый язык=${newLanguage}, сохраняем=${languageToSave}`);
      
      return stmt.run(
        userData.phone_number_clean || null,
        userData.first_name || null,
        userData.last_name || null,
        userData.country || null,
        languageToSave,
        userData.phone_number
      );
    } else {
      // Создаем нового пользователя
      const stmt = db.prepare(`
        INSERT INTO whatsapp_users (
          phone_number, phone_number_clean, first_name, last_name,
          country, language, last_message_at, message_count, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 1, 1)
      `);
      return stmt.run(
        userData.phone_number,
        userData.phone_number_clean || null,
        userData.first_name || null,
        userData.last_name || null,
        userData.country || null,
        userData.language || 'ru'
      );
    }
  },

  /**
   * Получить WhatsApp пользователя по номеру телефона
   */
  getByPhone: (phoneNumber) => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM whatsapp_users WHERE phone_number = ?');
    return stmt.get(phoneNumber);
  },

  /**
   * Получить всех WhatsApp пользователей (с пагинацией)
   */
  getAll: (limit = 100, offset = 0) => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM whatsapp_users 
      ORDER BY last_message_at DESC, created_at DESC 
      LIMIT ? OFFSET ?
    `);
    return stmt.all(limit, offset);
  },

  /**
   * Получить количество всех WhatsApp пользователей
   */
  getCount: () => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT COUNT(*) as count FROM whatsapp_users');
    const result = stmt.get();
    return result ? result.count : 0;
  },

  /**
   * Получить активных WhatsApp пользователей
   */
  getActive: (limit = 100, offset = 0) => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM whatsapp_users 
      WHERE is_active = 1 
      ORDER BY last_message_at DESC 
      LIMIT ? OFFSET ?
    `);
    return stmt.all(limit, offset);
  },

  /**
   * Поиск WhatsApp пользователей по имени, телефону или стране
   */
  search: (query, limit = 100, offset = 0) => {
    const db = getDatabase();
    const searchTerm = `%${query}%`;
    const stmt = db.prepare(`
      SELECT * FROM whatsapp_users 
      WHERE 
        phone_number LIKE ? OR 
        phone_number_clean LIKE ? OR 
        first_name LIKE ? OR 
        last_name LIKE ? OR 
        country LIKE ?
      ORDER BY last_message_at DESC 
      LIMIT ? OFFSET ?
    `);
    return stmt.all(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, limit, offset);
  },

  /**
   * Обновить статус активности пользователя
   */
  updateActiveStatus: (phoneNumber, isActive) => {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE whatsapp_users 
      SET is_active = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE phone_number = ?
    `);
    return stmt.run(isActive ? 1 : 0, phoneNumber);
  },

  /**
   * Удалить WhatsApp пользователя
   */
  delete: (phoneNumber) => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM whatsapp_users WHERE phone_number = ?');
    return stmt.run(phoneNumber);
  },

  /**
   * Обновить тип лида по номеру WhatsApp (формат 7999...@c.us). Если строки ещё нет — создаёт минимальную запись.
   */
  updateLeadType: (phoneNumber, leadType) => {
    const db = getDatabase();
    const allowed = new Set(['hot', 'warm', 'cold']);
    if (!phoneNumber || !allowed.has(leadType)) return { changes: 0, inserted: false };
    const existing = db.prepare('SELECT id FROM whatsapp_users WHERE phone_number = ?').get(phoneNumber);
    if (existing) {
      const stmt = db.prepare(`
        UPDATE whatsapp_users
        SET lead_type = ?, updated_at = CURRENT_TIMESTAMP
        WHERE phone_number = ?
      `);
      const r = stmt.run(leadType, phoneNumber);
      return { changes: r.changes, inserted: false };
    }
    const clean = String(phoneNumber).replace(/@c\.us$/i, '').replace(/@g\.us$/i, '');
    const ins = db.prepare(`
      INSERT INTO whatsapp_users (
        phone_number, phone_number_clean, language, lead_type,
        last_message_at, message_count, is_active
      ) VALUES (?, ?, 'ru', ?, CURRENT_TIMESTAMP, 0, 1)
    `);
    ins.run(phoneNumber, clean || null, leadType);
    return { changes: 1, inserted: true };
  }
};

// ========== ФУНКЦИИ ДЛЯ РАБОТЫ С ЗАПРОСАМИ НА ПОКУПКУ ==========

export const purchaseRequestQueries = {
  /**
   * Создать новый запрос на покупку
   */
  create: (requestData) => {
    const db = getDatabase();
    
    // Проверяем, какие поля существуют в таблице
    const pragmaInfo = db.prepare("PRAGMA table_info(purchase_requests)").all();
    const columnNames = pragmaInfo.map(col => col.name);
    
    // Базовые поля (всегда должны быть)
    const baseFields = [
      'buyer_id', 'buyer_name', 'buyer_email', 'buyer_phone',
      'seller_id', 'seller_name', 'seller_email', 'seller_phone',
      'property_id', 'property_title', 'property_price', 'property_currency',
      'property_location', 'property_type', 'property_area',
      'request_date', 'status'
    ];
    
    // Дополнительные поля (могут отсутствовать в старых БД)
    const additionalFields = [
      'property_description', 'property_rooms', 'property_bedrooms', 'property_bathrooms',
      'property_floor', 'property_total_floors', 'property_year_built',
      'property_living_area', 'property_land_area', 'property_building_type',
      'property_renovation', 'property_condition', 'property_heating',
      'property_water_supply', 'property_sewerage',
      'property_balcony', 'property_parking', 'property_elevator',
      'property_garage', 'property_pool', 'property_garden',
      'property_electricity', 'property_internet', 'property_security', 'property_furniture',
      'property_commercial_type', 'property_business_hours'
    ];
    
    // Формируем список полей и значений динамически
    const fieldsToInsert = [];
    const valuesToInsert = [];
    
    // Добавляем базовые поля
    baseFields.forEach(field => {
      if (columnNames.includes(field)) {
        fieldsToInsert.push(field);
      }
    });
    
    // Добавляем дополнительные поля, если они существуют
    additionalFields.forEach(field => {
      if (columnNames.includes(field)) {
        fieldsToInsert.push(field);
      }
    });
    
    // Формируем значения для базовых полей
    if (columnNames.includes('buyer_id')) valuesToInsert.push(requestData.buyerId || null);
    if (columnNames.includes('buyer_name')) valuesToInsert.push(requestData.buyerName);
    if (columnNames.includes('buyer_email')) valuesToInsert.push(requestData.buyerEmail || null);
    if (columnNames.includes('buyer_phone')) valuesToInsert.push(requestData.buyerPhone || null);
    if (columnNames.includes('seller_id')) valuesToInsert.push(requestData.sellerId || null);
    if (columnNames.includes('seller_name')) valuesToInsert.push(requestData.sellerName || null);
    if (columnNames.includes('seller_email')) valuesToInsert.push(requestData.sellerEmail || null);
    if (columnNames.includes('seller_phone')) valuesToInsert.push(requestData.sellerPhone || null);
    if (columnNames.includes('property_id')) valuesToInsert.push(requestData.propertyId || null);
    if (columnNames.includes('property_title')) valuesToInsert.push(requestData.propertyTitle);
    if (columnNames.includes('property_price')) valuesToInsert.push(requestData.propertyPrice || null);
    if (columnNames.includes('property_currency')) valuesToInsert.push(requestData.propertyCurrency || 'USD');
    if (columnNames.includes('property_location')) valuesToInsert.push(requestData.propertyLocation || null);
    if (columnNames.includes('property_type')) valuesToInsert.push(requestData.propertyType || null);
    if (columnNames.includes('property_area')) valuesToInsert.push(requestData.propertyArea || null);
    if (columnNames.includes('request_date')) valuesToInsert.push(requestData.requestDate);
    if (columnNames.includes('status')) valuesToInsert.push(requestData.status || 'pending');
    
    // Формируем значения для дополнительных полей
    if (columnNames.includes('property_description')) valuesToInsert.push(requestData.propertyDescription || null);
    if (columnNames.includes('property_rooms')) valuesToInsert.push(requestData.propertyRooms || null);
    if (columnNames.includes('property_bedrooms')) valuesToInsert.push((requestData.propertyBedrooms !== undefined && requestData.propertyBedrooms !== null && requestData.propertyBedrooms !== '') ? requestData.propertyBedrooms : null);
    if (columnNames.includes('property_bathrooms')) valuesToInsert.push(requestData.propertyBathrooms || null);
    if (columnNames.includes('property_floor')) valuesToInsert.push(requestData.propertyFloor !== undefined && requestData.propertyFloor !== null ? requestData.propertyFloor : null);
    if (columnNames.includes('property_total_floors')) valuesToInsert.push(requestData.propertyTotalFloors !== undefined && requestData.propertyTotalFloors !== null ? requestData.propertyTotalFloors : null);
    if (columnNames.includes('property_year_built')) valuesToInsert.push(requestData.propertyYearBuilt !== undefined && requestData.propertyYearBuilt !== null ? requestData.propertyYearBuilt : null);
    if (columnNames.includes('property_living_area')) valuesToInsert.push(requestData.propertyLivingArea || null);
    if (columnNames.includes('property_land_area')) valuesToInsert.push(requestData.propertyLandArea || null);
    if (columnNames.includes('property_building_type')) valuesToInsert.push(requestData.propertyBuildingType || null);
    if (columnNames.includes('property_renovation')) valuesToInsert.push(requestData.propertyRenovation || null);
    if (columnNames.includes('property_condition')) valuesToInsert.push(requestData.propertyCondition || null);
    if (columnNames.includes('property_heating')) valuesToInsert.push(requestData.propertyHeating || null);
    if (columnNames.includes('property_water_supply')) valuesToInsert.push(requestData.propertyWaterSupply || null);
    if (columnNames.includes('property_sewerage')) valuesToInsert.push(requestData.propertySewerage || null);
    if (columnNames.includes('property_balcony')) valuesToInsert.push(requestData.propertyBalcony === 1 || requestData.propertyBalcony === true ? 1 : 0);
    if (columnNames.includes('property_parking')) valuesToInsert.push(requestData.propertyParking === 1 || requestData.propertyParking === true ? 1 : 0);
    if (columnNames.includes('property_elevator')) valuesToInsert.push(requestData.propertyElevator === 1 || requestData.propertyElevator === true ? 1 : 0);
    if (columnNames.includes('property_garage')) valuesToInsert.push(requestData.propertyGarage === 1 || requestData.propertyGarage === true ? 1 : 0);
    if (columnNames.includes('property_pool')) valuesToInsert.push(requestData.propertyPool === 1 || requestData.propertyPool === true ? 1 : 0);
    if (columnNames.includes('property_garden')) valuesToInsert.push(requestData.propertyGarden === 1 || requestData.propertyGarden === true ? 1 : 0);
    if (columnNames.includes('property_electricity')) valuesToInsert.push(requestData.propertyElectricity === 1 || requestData.propertyElectricity === true ? 1 : 0);
    if (columnNames.includes('property_internet')) valuesToInsert.push(requestData.propertyInternet === 1 || requestData.propertyInternet === true ? 1 : 0);
    if (columnNames.includes('property_security')) valuesToInsert.push(requestData.propertySecurity === 1 || requestData.propertySecurity === true ? 1 : 0);
    if (columnNames.includes('property_furniture')) valuesToInsert.push(requestData.propertyFurniture === 1 || requestData.propertyFurniture === true ? 1 : 0);
    if (columnNames.includes('property_commercial_type')) valuesToInsert.push(requestData.propertyCommercialType || null);
    if (columnNames.includes('property_business_hours')) valuesToInsert.push(requestData.propertyBusinessHours || null);
    
    const placeholders = fieldsToInsert.map(() => '?').join(', ');
    const stmt = db.prepare(`
      INSERT INTO purchase_requests (${fieldsToInsert.join(', ')})
      VALUES (${placeholders})
    `);
    
    return stmt.run(...valuesToInsert);
  },

  /**
   * Получить все запросы на покупку
   */
  getAll: (limit = 100, offset = 0) => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM purchase_requests 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `);
    return stmt.all(limit, offset);
  },

  /**
   * Получить запрос по ID
   */
  getById: (id) => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM purchase_requests WHERE id = ?');
    return stmt.get(id);
  },

  /**
   * Получить запросы конкретного покупателя
   */
  getByBuyerId: (buyerId, limit = 50, offset = 0) => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM purchase_requests 
      WHERE buyer_id = ? 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `);
    return stmt.all(buyerId, limit, offset);
  },

  /**
   * Получить запросы по статусу
   */
  getByStatus: (status, limit = 100, offset = 0) => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM purchase_requests 
      WHERE status = ? 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `);
    return stmt.all(status, limit, offset);
  },

  /**
   * Обновить статус запроса
   */
  updateStatus: (id, status, adminNotes = null) => {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE purchase_requests 
      SET status = ?, admin_notes = ?, updated_at = datetime('now')
      WHERE id = ?
    `);
    return stmt.run(status, adminNotes, id);
  },

  /**
   * Получить количество запросов
   */
  getCount: () => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT COUNT(*) as count FROM purchase_requests');
    const result = stmt.get();
    return result ? result.count : 0;
  },

  /**
   * Получить количество запросов по статусу
   */
  getCountByStatus: (status) => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT COUNT(*) as count FROM purchase_requests WHERE status = ?');
    const result = stmt.get(status);
    return result ? result.count : 0;
  },

  /**
   * Удалить запрос
   */
  delete: (id) => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM purchase_requests WHERE id = ?');
    return stmt.run(id);
  }
};

// ========== ЛИДЫ УМНОГО ПОМОЩНИКА ==========

/**
 * Вычисление типа лида по сообщениям и предпочтениям
 * hot — горячий (обсуждал цену/бюджет, много сообщений, готов к контакту)
 * warm — тёплый (уточнял параметры, есть предпочтения)
 * cold — холодный (мало сообщений, общие вопросы)
 */
function computeLeadType(messages, preferences) {
  const msgList = Array.isArray(messages) ? messages : (messages ? JSON.parse(messages || '[]') : []);
  const prefs = typeof preferences === 'object' ? preferences : (preferences ? JSON.parse(preferences || '{}') : {});
  const userMessages = msgList.filter(m => m.sender === 'user').map(m => (m.text || '').toLowerCase()).join(' ');
  const hasBudget = !!(prefs.budget || /бюджет|цена|евро|€|euro|стоимость|сколько стоит/i.test(userMessages));
  const hasContactIntent = /контакт|телефон|позвонить|почта|email|связь|связаться/i.test(userMessages);
  const hasLocation = !!(prefs.location || prefs.region || /испани|дубай|барселон|мадрид|оаэ|страна|регион|город/i.test(userMessages));
  const hasPropertyType = !!(prefs.propertyType || /квартир|дом|апартамент|вилл|недвижимость/i.test(userMessages));
  const count = msgList.length;

  if (count >= 8 || (hasBudget && (hasContactIntent || count >= 6))) return 'hot';
  if (count >= 4 || hasBudget || hasLocation || hasPropertyType) return 'warm';
  return 'cold';
}

const LEAD_RANK = { hot: 3, warm: 2, cold: 1 };

/** Берём более «тёплый» тип, чтобы синхронизация с сайта не затирала оценку из WhatsApp-бота */
function mergeLeadTypes(a, b) {
  const ra = LEAD_RANK[a] || 0;
  const rb = LEAD_RANK[b] || 0;
  const best = ra >= rb ? a : b;
  return LEAD_RANK[best] ? best : (b || a || 'cold');
}

/**
 * Формирование краткой выжимки по диалогу и предпочтениям
 */
function buildSummary(messages, preferences) {
  const prefs = typeof preferences === 'object' ? preferences : (preferences ? JSON.parse(preferences || '{}') : {});
  const msgList = Array.isArray(messages) ? messages : (messages ? JSON.parse(messages || '[]') : []);
  const parts = [];

  if (prefs.purpose) parts.push(`Цель: ${prefs.purpose}`);
  if (prefs.budget) parts.push(`Бюджет: ${prefs.budget}`);
  if (prefs.location) parts.push(`Регион/локация: ${prefs.location}`);
  if (prefs.propertyType) parts.push(`Тип объекта: ${prefs.propertyType}`);
  if (prefs.rooms) parts.push(`Комнат: ${prefs.rooms}`);
  if (prefs.area) parts.push(`Площадь: ${prefs.area}`);
  if (prefs.other) parts.push(`Прочее: ${prefs.other}`);

  const userTexts = msgList.filter(m => m.sender === 'user').map(m => m.text || '');
  if (userTexts.some(t => /цена|бюджет|евро|стоимость/i.test(t))) parts.push('Дошли до обсуждения цены.');
  if (userTexts.some(t => /квартир|дом|апартамент|объект/i.test(t))) parts.push('Уточнял тип недвижимости.');
  if (userTexts.some(t => /испани|дубай|барселон|оаэ|страна|регион/i.test(t))) parts.push('Уточнял регион/страну.');

  return parts.length ? parts.join(' ') : 'Общение с ботом без выделенных предпочтений.';
}

function parseAssistantLeadJsonColumn(val, fallback) {
  if (val == null || val === '') return fallback;
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

/** Строка из SQLite → безопасные messages/preferences для API (массив / объект). */
function normalizeAssistantLeadRow(row) {
  if (!row) return null;
  const rawMessages = parseAssistantLeadJsonColumn(row.messages, []);
  const rawPrefs = parseAssistantLeadJsonColumn(row.preferences, {});
  return {
    ...row,
    messages: Array.isArray(rawMessages) ? rawMessages : [],
    preferences: rawPrefs && typeof rawPrefs === 'object' ? rawPrefs : {}
  };
}

export const assistantLeadQueries = {
  upsert: (data) => {
    const db = getDatabase();
    const { sessionId, userId, messages, preferences, email, phone } = data;
    const messagesStr = typeof messages === 'string' ? messages : JSON.stringify(messages || []);
    const preferencesStr = typeof preferences === 'string' ? preferences : JSON.stringify(preferences || {});
    const computedType = computeLeadType(messages, preferences);
    const summary = buildSummary(messages, preferences);

    const prefs = typeof preferences === 'object' ? preferences : JSON.parse(preferencesStr);
    const country = prefs.country || (prefs.location && String(prefs.location).split(/[,;]/)[0]) || null;
    const region = prefs.location || prefs.region || null;
    const propertyType = prefs.propertyType || null;

    const existing = db.prepare('SELECT id, lead_type FROM assistant_leads WHERE session_id = ?').get(sessionId);
    const leadType = existing ? mergeLeadTypes(existing.lead_type, computedType) : computedType;
    if (existing) {
      const stmt = db.prepare(`
        UPDATE assistant_leads SET
          user_id = ?, messages = ?, preferences = ?, summary = ?, lead_type = ?,
          email = COALESCE(?, email), phone = COALESCE(?, phone),
          country = ?, region = ?, property_type = ?, updated_at = datetime('now')
        WHERE session_id = ?
      `);
      stmt.run(userId || null, messagesStr, preferencesStr, summary, leadType, email || null, phone || null, country, region, propertyType, sessionId);
      return { id: existing.id, created: false };
    }
    const result = db.prepare(`
      INSERT INTO assistant_leads (session_id, user_id, messages, preferences, summary, lead_type, email, phone, country, region, property_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(sessionId, userId || null, messagesStr, preferencesStr, summary, leadType, email || null, phone || null, country, region, propertyType);
    return { id: result.lastInsertRowid, created: true };
  },

  getAll: () => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT id, session_id, user_id, summary, lead_type, email, phone, country, region, property_type, created_at, updated_at
      FROM assistant_leads ORDER BY updated_at DESC
    `);
    return stmt.all();
  },

  getById: (id) => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM assistant_leads WHERE id = ?');
    const row = stmt.get(id);
    return normalizeAssistantLeadRow(row);
  },

  /**
   * Проставить lead_type всем карточкам умного помощника с тем же телефоном (только цифры), что у WhatsApp.
   */
  updateLeadTypeByPhoneDigits: (digitsOnly, leadType) => {
    const db = getDatabase();
    const allowed = new Set(['hot', 'warm', 'cold']);
    if (!digitsOnly || !allowed.has(leadType)) return 0;
    const rows = db.prepare(
      'SELECT id, phone, lead_type FROM assistant_leads WHERE phone IS NOT NULL AND trim(phone) != \'\''
    ).all();
    const norm = (p) => String(p || '').replace(/\D/g, '');
    const stmt = db.prepare(
      `UPDATE assistant_leads SET lead_type = ?, updated_at = datetime('now') WHERE id = ?`
    );
    let n = 0;
    for (const row of rows) {
      if (norm(row.phone) === digitsOnly) {
        const merged = mergeLeadTypes(row.lead_type, leadType);
        stmt.run(merged, row.id);
        n++;
      }
    }
    return n;
  }
};

// ========== ФУНКЦИИ ДЛЯ РАБОТЫ С КВАРТИРАМИ/АПАРТАМЕНТАМИ ==========

/**
 * Вспомогательная функция для проверки и создания таблицы properties_apartments
 */
function ensureApartmentsTable() {
  const db = getDatabase();
  try {
    // Проверяем существование таблицы
    const result = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='properties_apartments'").get();
    const tableExists = result !== undefined && result !== null;
    
    console.log('🔍 Проверка таблицы properties_apartments:', { result, tableExists });
    
    if (!tableExists) {
      console.log('⚠️ Таблица properties_apartments не найдена, создаю...');
      
      // Создаем таблицу
      db.exec(`
        CREATE TABLE IF NOT EXISTS properties_apartments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          property_type TEXT NOT NULL CHECK(property_type IN ('apartment', 'commercial')),
          title TEXT NOT NULL,
          description TEXT,
          price REAL,
          currency TEXT DEFAULT 'USD',
          is_auction INTEGER DEFAULT 0,
          auction_start_date TEXT,
          auction_end_date TEXT,
          auction_starting_price REAL,
          area REAL,
          living_area REAL,
          building_type TEXT,
          rooms INTEGER,
          bathrooms INTEGER,
          floor INTEGER,
          total_floors INTEGER,
          year_built INTEGER,
          location TEXT,
          address TEXT,
          apartment TEXT,
          country TEXT,
          city TEXT,
          coordinates TEXT,
          amenities TEXT,
          renovation TEXT,
          condition TEXT,
          heating TEXT,
          water_supply TEXT,
          sewerage TEXT,
          balcony INTEGER DEFAULT 0,
          parking INTEGER DEFAULT 0,
          elevator INTEGER DEFAULT 0,
          electricity INTEGER DEFAULT 0,
          internet INTEGER DEFAULT 0,
          security INTEGER DEFAULT 0,
          furniture INTEGER DEFAULT 0,
          commercial_type TEXT,
          business_hours TEXT,
          additional_amenities TEXT,
          photos TEXT,
          videos TEXT,
          additional_documents TEXT,
          ownership_document TEXT,
          no_debts_document TEXT,
          test_drive INTEGER DEFAULT 0,
          test_drive_data TEXT,
          moderation_status TEXT DEFAULT 'pending',
          reviewed_by TEXT,
          reviewed_at TEXT,
          rejection_reason TEXT,
          is_shared_ownership INTEGER DEFAULT 0,
          total_shares INTEGER,
          shares_sold INTEGER DEFAULT 0,
          reserved_until TEXT,
          reserved_by INTEGER,
          purchase_request_id INTEGER,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      
      // Создаем индексы отдельно
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_apartments_user_id ON properties_apartments(user_id);
        CREATE INDEX IF NOT EXISTS idx_apartments_moderation_status ON properties_apartments(moderation_status);
        CREATE INDEX IF NOT EXISTS idx_apartments_property_type ON properties_apartments(property_type);
        CREATE INDEX IF NOT EXISTS idx_apartments_user_status ON properties_apartments(user_id, moderation_status);
        CREATE INDEX IF NOT EXISTS idx_apartments_city ON properties_apartments(city);
        CREATE INDEX IF NOT EXISTS idx_apartments_country ON properties_apartments(country);
      `);
      
      // Проверяем, что таблица действительно создана
      const verifyResult = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='properties_apartments'").get();
      if (verifyResult) {
        console.log('✅ Таблица properties_apartments успешно создана и проверена');
      } else {
        console.error('❌ Таблица properties_apartments не была создана!');
        throw new Error('Не удалось создать таблицу properties_apartments');
      }
    }
    // Для существующей или только что созданной таблицы — добавляем недостающие колонки (sale_type, is_debt, debt_* и т.д.)
    const apartmentsPragma = db.prepare("PRAGMA table_info(properties_apartments)").all();
    const existingFields = apartmentsPragma.map(f => f.name);
    const requiredFields = {
      'sale_type': 'TEXT',
      'is_debt': 'INTEGER DEFAULT 0',
      'has_debt': 'INTEGER DEFAULT 0',
      'debt_utilities': 'INTEGER DEFAULT 0',
      'debt_mortgage_pledge': 'INTEGER DEFAULT 0',
      'debt_property_taxes': 'INTEGER DEFAULT 0',
      'debt_arrest': 'INTEGER DEFAULT 0',
      'debt_inherited': 'INTEGER DEFAULT 0',
      'debt_third_party': 'INTEGER DEFAULT 0',
      'debt_other': 'TEXT',
      'debt_amount': 'REAL',
      'debt_severity': 'TEXT'
    };
    for (const [fieldName, fieldType] of Object.entries(requiredFields)) {
      if (!existingFields.includes(fieldName)) {
        try {
          db.exec(`ALTER TABLE properties_apartments ADD COLUMN ${fieldName} ${fieldType}`);
          console.log(`✅ Добавлено поле ${fieldName} в properties_apartments`);
          existingFields.push(fieldName);
        } catch (alterError) {
          console.warn(`⚠️ Не удалось добавить поле ${fieldName}:`, alterError.message);
        }
      }
    }
    if (tableExists) {
      console.log('✅ Таблица properties_apartments уже существует');
    }
  } catch (tableError) {
    console.error('❌ Ошибка при проверке/создании таблицы properties_apartments:', tableError.message);
    console.error('❌ Stack:', tableError.stack);
    throw tableError;
  }
}

/**
 * Создание таблицы properties_houses (аналог ensureApartmentsTable — раньше не вызывалась при INSERT домов).
 */
function ensureHousesTable() {
  const db = getDatabase();
  try {
    const result = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='properties_houses'").get();
    const tableExists = result !== undefined && result !== null;

    if (!tableExists) {
      console.log('⚠️ Таблица properties_houses не найдена, создаю...');
      db.exec(`
        CREATE TABLE IF NOT EXISTS properties_houses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          property_type TEXT NOT NULL CHECK(property_type IN ('house', 'villa')),
          title TEXT NOT NULL,
          description TEXT,
          price REAL,
          currency TEXT DEFAULT 'USD',
          is_auction INTEGER DEFAULT 0,
          auction_start_date TEXT,
          auction_end_date TEXT,
          auction_starting_price REAL,
          area REAL,
          living_area REAL,
          land_area REAL,
          building_type TEXT,
          bedrooms INTEGER,
          bathrooms INTEGER,
          floors INTEGER,
          year_built INTEGER,
          location TEXT,
          address TEXT,
          country TEXT,
          city TEXT,
          coordinates TEXT,
          amenities TEXT,
          renovation TEXT,
          condition TEXT,
          heating TEXT,
          water_supply TEXT,
          sewerage TEXT,
          pool INTEGER DEFAULT 0,
          garden INTEGER DEFAULT 0,
          garage INTEGER DEFAULT 0,
          parking INTEGER DEFAULT 0,
          electricity INTEGER DEFAULT 0,
          internet INTEGER DEFAULT 0,
          security INTEGER DEFAULT 0,
          furniture INTEGER DEFAULT 0,
          additional_amenities TEXT,
          photos TEXT,
          videos TEXT,
          additional_documents TEXT,
          ownership_document TEXT,
          no_debts_document TEXT,
          test_drive INTEGER DEFAULT 0,
          test_drive_data TEXT,
          moderation_status TEXT DEFAULT 'pending',
          reviewed_by TEXT,
          reviewed_at TEXT,
          rejection_reason TEXT,
          is_shared_ownership INTEGER DEFAULT 0,
          total_shares INTEGER,
          shares_sold INTEGER DEFAULT 0,
          sale_type TEXT,
          is_debt INTEGER DEFAULT 0,
          has_debt INTEGER DEFAULT 0,
          debt_utilities INTEGER DEFAULT 0,
          debt_mortgage_pledge INTEGER DEFAULT 0,
          debt_property_taxes INTEGER DEFAULT 0,
          debt_arrest INTEGER DEFAULT 0,
          debt_inherited INTEGER DEFAULT 0,
          debt_third_party INTEGER DEFAULT 0,
          debt_other TEXT,
          debt_amount REAL,
          debt_severity TEXT,
          reserved_until TEXT,
          reserved_by INTEGER,
          purchase_request_id INTEGER,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_houses_user_id ON properties_houses(user_id);
        CREATE INDEX IF NOT EXISTS idx_houses_moderation_status ON properties_houses(moderation_status);
        CREATE INDEX IF NOT EXISTS idx_houses_property_type ON properties_houses(property_type);
        CREATE INDEX IF NOT EXISTS idx_houses_user_status ON properties_houses(user_id, moderation_status);
        CREATE INDEX IF NOT EXISTS idx_houses_city ON properties_houses(city);
        CREATE INDEX IF NOT EXISTS idx_houses_country ON properties_houses(country);
      `);
      const verifyResult = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='properties_houses'").get();
      if (verifyResult) {
        console.log('✅ Таблица properties_houses успешно создана и проверена');
      } else {
        throw new Error('Не удалось создать таблицу properties_houses');
      }
    }

    const housesPragma = db.prepare('PRAGMA table_info(properties_houses)').all();
    const existingFields = housesPragma.map((f) => f.name);
    const requiredFields = {
      reserved_until: 'TEXT',
      reserved_by: 'INTEGER',
      purchase_request_id: 'INTEGER',
      is_shared_ownership: 'INTEGER DEFAULT 0',
      total_shares: 'INTEGER',
      shares_sold: 'INTEGER DEFAULT 0',
      sale_type: 'TEXT',
      is_debt: 'INTEGER DEFAULT 0',
      has_debt: 'INTEGER DEFAULT 0',
      debt_utilities: 'INTEGER DEFAULT 0',
      debt_mortgage_pledge: 'INTEGER DEFAULT 0',
      debt_property_taxes: 'INTEGER DEFAULT 0',
      debt_arrest: 'INTEGER DEFAULT 0',
      debt_inherited: 'INTEGER DEFAULT 0',
      debt_third_party: 'INTEGER DEFAULT 0',
      debt_other: 'TEXT',
      debt_amount: 'REAL',
      debt_severity: 'TEXT'
    };
    for (const [fieldName, fieldType] of Object.entries(requiredFields)) {
      if (!existingFields.includes(fieldName)) {
        try {
          db.exec(`ALTER TABLE properties_houses ADD COLUMN ${fieldName} ${fieldType}`);
          console.log(`✅ Добавлено поле ${fieldName} в properties_houses`);
          existingFields.push(fieldName);
        } catch (alterError) {
          console.warn(`⚠️ Не удалось добавить поле ${fieldName} в properties_houses:`, alterError.message);
        }
      }
    }
    if (tableExists) {
      console.log('✅ Таблица properties_houses уже существует');
    }
  } catch (tableError) {
    console.error('❌ Ошибка при проверке/создании таблицы properties_houses:', tableError.message);
    console.error('❌ Stack:', tableError.stack);
    throw tableError;
  }
}

export const apartmentQueries = {
  /**
   * Создать новое объявление о квартире/апартаменте
   */
  create: (propertyData) => {
    // Проверяем существование таблицы и создаем её, если её нет
    // ВАЖНО: это должно быть ПЕРВЫМ действием
    ensureApartmentsTable();
    
    const db = getDatabase();
    
    // Формируем JSON массив удобств из отдельных полей
    // ВАЖНО: Добавляем в массив ТОЛЬКО те удобства, которые явно выбраны пользователем (равны 1 или true)
    const amenities = [];
    
    // Основные удобства - проверяем строго (только 1 или true, не 0, не undefined, не '0')
    if (propertyData.balcony === 1 || propertyData.balcony === true || propertyData.balcony === '1') {
      amenities.push('balcony');
    }
    if (propertyData.parking === 1 || propertyData.parking === true || propertyData.parking === '1') {
      amenities.push('parking');
    }
    if (propertyData.elevator === 1 || propertyData.elevator === true || propertyData.elevator === '1') {
      amenities.push('elevator');
    }
    if (propertyData.electricity === 1 || propertyData.electricity === true || propertyData.electricity === '1') {
      amenities.push('electricity');
    }
    if (propertyData.internet === 1 || propertyData.internet === true || propertyData.internet === '1') {
      amenities.push('internet');
    }
    if (propertyData.security === 1 || propertyData.security === true || propertyData.security === '1') {
      amenities.push('security');
    }
    if (propertyData.furniture === 1 || propertyData.furniture === true || propertyData.furniture === '1') {
      amenities.push('furniture');
    }
    
    // Добавляем feature поля в массив удобств - проверяем строго
    for (let i = 1; i <= 26; i++) {
      const featureKey = `feature${i}`;
      const featureValue = propertyData[featureKey];
      if (featureValue === 1 || featureValue === true || featureValue === '1') {
        amenities.push(featureKey);
      }
    }
    
    // Пытаемся выполнить INSERT, если таблицы нет - создаем её и повторяем
    let stmt;
    try {
      stmt = db.prepare(`
        INSERT INTO properties_apartments (
          user_id, property_type, title, description, price, currency,
          is_auction, auction_start_date, auction_end_date, auction_starting_price,
          area, living_area, building_type, rooms, bathrooms, floor, total_floors, year_built,
          location, address, apartment, country, city, coordinates,
          amenities, renovation, condition, heating, water_supply, sewerage,
          commercial_type, business_hours, additional_amenities,
          photos, videos, additional_documents,
          ownership_document, no_debts_document,
          test_drive, test_drive_data,
          is_shared_ownership, total_shares, shares_sold,
          moderation_status, sale_type, is_debt, has_debt,
          debt_utilities, debt_mortgage_pledge, debt_property_taxes,
          debt_arrest, debt_inherited, debt_third_party, debt_other, debt_amount
        ) VALUES (
          ?, ?, ?, ?, ?, ?,        -- user_id ... currency
          ?, ?, ?, ?,              -- is_auction ... auction_starting_price
          ?, ?, ?, ?, ?, ?, ?, ?,  -- area ... year_built
          ?, ?, ?, ?, ?, ?,        -- location ... coordinates
          ?, ?, ?, ?, ?, ?,        -- amenities ... sewerage
          ?, ?, ?,                 -- commercial_type ... additional_amenities
          ?, ?, ?,                 -- photos, videos, additional_documents
          ?, ?, ?, ?,              -- ownership_document ... test_drive_data
          ?, ?, ?,                 -- is_shared_ownership, total_shares, shares_sold
          ?, ?, ?, ?,              -- moderation_status, sale_type, is_debt, has_debt
          ?, ?, ?, ?, ?, ?, ?, ?   -- debt_* поля
        )
      `);
    } catch (prepareError) {
      if (prepareError.message && prepareError.message.includes('no such table: properties_apartments')) {
        console.log('⚠️ Таблица не найдена при prepare, создаю...');
        ensureApartmentsTable();
        // Повторяем попытку
        stmt = db.prepare(`
          INSERT INTO properties_apartments (
            user_id, property_type, title, description, price, currency,
            is_auction, auction_start_date, auction_end_date, auction_starting_price,
            area, living_area, building_type, rooms, bathrooms, floor, total_floors, year_built,
            location, address, apartment, country, city, coordinates,
            amenities, renovation, condition, heating, water_supply, sewerage,
            commercial_type, business_hours, additional_amenities,
            photos, videos, additional_documents,
            ownership_document, no_debts_document,
            test_drive, test_drive_data,
          is_shared_ownership, total_shares, shares_sold,
          moderation_status, sale_type, is_debt, has_debt,
          debt_utilities, debt_mortgage_pledge, debt_property_taxes,
          debt_arrest, debt_inherited, debt_third_party, debt_other, debt_amount
          ) VALUES (
            ?, ?, ?, ?, ?, ?,        -- user_id ... currency
            ?, ?, ?, ?,              -- is_auction ... auction_starting_price
            ?, ?, ?, ?, ?, ?, ?, ?,  -- area ... year_built
            ?, ?, ?, ?, ?, ?,        -- location ... coordinates
            ?, ?, ?, ?, ?, ?,        -- amenities ... sewerage
            ?, ?, ?,                 -- commercial_type ... additional_amenities
            ?, ?, ?,                 -- photos, videos, additional_documents
            ?, ?, ?, ?,              -- ownership_document ... test_drive_data
            ?, ?, ?,                 -- is_shared_ownership, total_shares, shares_sold
            ?, ?, ?, ?,              -- moderation_status, sale_type, is_debt, has_debt
            ?, ?, ?, ?, ?, ?, ?, ?   -- debt_* поля
          )
        `);
      } else {
        throw prepareError;
      }
    }
    
    return stmt.run(
      propertyData.user_id,
      propertyData.property_type,
      propertyData.title,
      propertyData.description || null,
      propertyData.price || null,
      propertyData.currency || 'USD',
      propertyData.is_auction ? 1 : 0,
      propertyData.auction_start_date || null,
      propertyData.auction_end_date || null,
      propertyData.auction_starting_price || null,
      propertyData.area || null,
      propertyData.living_area || null,
      propertyData.building_type || null,
      propertyData.rooms || null,
      propertyData.bathrooms || null,
      propertyData.floor || null,
      propertyData.total_floors || null,
      propertyData.year_built || null,
      propertyData.location || null,
      propertyData.address || null,
      propertyData.apartment || null,
      propertyData.country || null,
      propertyData.city || null,
      propertyData.coordinates ? JSON.stringify(propertyData.coordinates) : null,
      JSON.stringify(amenities),
      propertyData.renovation || null,
      propertyData.condition || null,
      propertyData.heating || null,
      propertyData.water_supply || null,
      propertyData.sewerage || null,
      propertyData.commercial_type || null,
      propertyData.business_hours || null,
      propertyData.additional_amenities || null,
      propertyData.photos ? JSON.stringify(propertyData.photos) : null,
      propertyData.videos ? JSON.stringify(propertyData.videos) : null,
      propertyData.additional_documents ? JSON.stringify(propertyData.additional_documents) : null,
      propertyData.ownership_document || null,
      propertyData.no_debts_document || null,
      propertyData.test_drive ? 1 : 0,
      propertyData.test_drive_data ? JSON.stringify(propertyData.test_drive_data) : null,
      propertyData.is_shared_ownership ? 1 : 0,
      propertyData.total_shares || null,
      propertyData.shares_sold != null ? propertyData.shares_sold : 0,
      propertyData.moderation_status || 'pending',
      propertyData.sale_type || null,
      propertyData.is_debt ? 1 : 0,
      propertyData.has_debt ? 1 : 0,
      propertyData.debt_utilities ? 1 : 0,
      propertyData.debt_mortgage_pledge ? 1 : 0,
      propertyData.debt_property_taxes ? 1 : 0,
      propertyData.debt_arrest ? 1 : 0,
      propertyData.debt_inherited ? 1 : 0,
      propertyData.debt_third_party ? 1 : 0,
      propertyData.debt_other || null,
      propertyData.debt_amount != null ? propertyData.debt_amount : null
    );
  },

  /**
   * Получить квартиру по ID
   */
  getById: (id) => {
    ensureApartmentsTable();
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM properties_apartments WHERE id = ?');
    const property = stmt.get(id);
    
    // КРИТИЧЕСКАЯ ПРОВЕРКА: Проверяем, что property_type соответствует таблице apartments
    // ВАЖНО: Проверка ДО парсинга JSON, чтобы не тратить время на неправильные объекты
    if (property) {
      if (property.property_type !== 'apartment' && property.property_type !== 'commercial') {
        console.error(`❌ apartmentQueries.getById: КРИТИЧЕСКАЯ ОШИБКА! Объект ID=${id} найден в properties_apartments, но property_type=${property.property_type} не соответствует таблице!`);
        console.error(`   Объект с типом ${property.property_type} не должен находиться в таблице properties_apartments!`);
        console.error(`   Это означает, что объект был неправильно сохранен в базу данных.`);
        console.error(`   Возвращаем null, чтобы предотвратить использование неправильного объекта.`);
        return null;
      }
      // Парсим JSON поля с безопасной обработкой ошибок
      if (property.amenities) {
        try {
          property.amenities = JSON.parse(property.amenities);
        } catch (e) {
          console.warn('⚠️ Ошибка парсинга amenities для property ID', id, ':', e.message);
          property.amenities = [];
        }
      }
      if (property.coordinates) {
        try {
          property.coordinates = JSON.parse(property.coordinates);
        } catch (e) {
          console.warn('⚠️ Ошибка парсинга coordinates для property ID', id, ':', e.message);
          property.coordinates = null;
        }
      }
      if (property.photos) {
        try {
          property.photos = JSON.parse(property.photos);
        } catch (e) {
          console.warn('⚠️ Ошибка парсинга photos для property ID', id, ':', e.message);
          property.photos = [];
        }
      }
      if (property.videos) {
        try {
          property.videos = JSON.parse(property.videos);
        } catch (e) {
          console.warn('⚠️ Ошибка парсинга videos для property ID', id, ':', e.message);
          property.videos = [];
        }
      }
      if (property.additional_documents) {
        try {
          property.additional_documents = JSON.parse(property.additional_documents);
        } catch (e) {
          console.warn('⚠️ Ошибка парсинга additional_documents для property ID', id, ':', e.message);
          console.warn('⚠️ Содержимое additional_documents:', property.additional_documents);
          property.additional_documents = [];
        }
      }
      if (property.test_drive_data) {
        try {
          property.test_drive_data = JSON.parse(property.test_drive_data);
        } catch (e) {
          console.warn('⚠️ Ошибка парсинга test_drive_data для property ID', id, ':', e.message);
          property.test_drive_data = null;
        }
      }
    }
    
    return property;
  },

  /**
   * Получить все квартиры/апартаменты пользователя
   */
  getByUserId: (userId, limit = 50, offset = 0) => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM properties_apartments 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `);
    const properties = stmt.all(userId, limit, offset);
    
    // Парсим JSON поля для каждого объекта безопасно
    return properties.map(property => {
      if (property.amenities && typeof property.amenities === 'string') {
        try {
          property.amenities = JSON.parse(property.amenities);
        } catch (e) {
          property.amenities = [];
        }
      } else if (!property.amenities) {
        property.amenities = [];
      }
      if (property.coordinates && typeof property.coordinates === 'string') {
        try {
          property.coordinates = JSON.parse(property.coordinates);
        } catch (e) {
          property.coordinates = null;
        }
      }
      if (property.photos && typeof property.photos === 'string') {
        try {
          property.photos = JSON.parse(property.photos);
        } catch (e) {
          property.photos = [];
        }
      } else if (!property.photos) {
        property.photos = [];
      }
      if (property.videos && typeof property.videos === 'string') {
        try {
          property.videos = JSON.parse(property.videos);
        } catch (e) {
          property.videos = [];
        }
      } else if (!property.videos) {
        property.videos = [];
      }
      if (property.additional_documents && typeof property.additional_documents === 'string') {
        try {
          property.additional_documents = JSON.parse(property.additional_documents);
        } catch (e) {
          property.additional_documents = [];
        }
      } else if (!property.additional_documents) {
        property.additional_documents = [];
      }
      if (property.test_drive_data && typeof property.test_drive_data === 'string') {
        try {
          property.test_drive_data = JSON.parse(property.test_drive_data);
        } catch (e) {
          property.test_drive_data = null;
        }
      }
      return property;
    });
  },

  /**
   * Получить все квартиры/апартаменты с фильтрами
   */
  getAll: (filters = {}, limit = 100, offset = 0) => {
    ensureApartmentsTable();
    const db = getDatabase();
    let query = 'SELECT * FROM properties_apartments WHERE 1=1';
    const params = [];
    
    if (filters.moderation_status) {
      query += ' AND moderation_status = ?';
      params.push(filters.moderation_status);
    }
    
    if (filters.property_type) {
      query += ' AND property_type = ?';
      params.push(filters.property_type);
    }
    
    if (filters.is_shared_ownership === 1 || filters.is_shared_ownership === true) {
      query += ' AND is_shared_ownership = 1';
    }
    
    if (filters.city) {
      query += ' AND city = ?';
      params.push(filters.city);
    }
    
    if (filters.country) {
      query += ' AND country = ?';
      params.push(filters.country);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    const stmt = db.prepare(query);
    const properties = stmt.all(...params);
    
    // Парсим JSON поля
    return properties.map(property => {
      if (property.amenities) property.amenities = JSON.parse(property.amenities);
      if (property.coordinates) property.coordinates = JSON.parse(property.coordinates);
      if (property.photos) property.photos = JSON.parse(property.photos);
      if (property.videos) property.videos = JSON.parse(property.videos);
      if (property.additional_documents) property.additional_documents = JSON.parse(property.additional_documents);
      if (property.test_drive_data) property.test_drive_data = JSON.parse(property.test_drive_data);
      return property;
    });
  },

  /**
   * Обновить квартиру/апартамент
   */
  update: (id, propertyData) => {
    const db = getDatabase();
    
    // Формируем JSON массив удобств
    const amenities = [];
    if (propertyData.balcony) amenities.push('balcony');
    if (propertyData.parking) amenities.push('parking');
    if (propertyData.elevator) amenities.push('elevator');
    if (propertyData.electricity) amenities.push('electricity');
    if (propertyData.internet) amenities.push('internet');
    if (propertyData.security) amenities.push('security');
    if (propertyData.furniture) amenities.push('furniture');
    
    for (let i = 1; i <= 26; i++) {
      const featureKey = `feature${i}`;
      if (propertyData[featureKey]) {
        amenities.push(featureKey);
      }
    }
    
    const stmt = db.prepare(`
      UPDATE properties_apartments SET
        title = ?, description = ?, price = ?, currency = ?,
        is_auction = ?, auction_start_date = ?, auction_end_date = ?, auction_starting_price = ?,
        area = ?, living_area = ?, building_type = ?, rooms = ?, bathrooms = ?, 
        floor = ?, total_floors = ?, year_built = ?,
        location = ?, address = ?, apartment = ?, country = ?, city = ?, coordinates = ?,
        amenities = ?, renovation = ?, condition = ?, heating = ?, water_supply = ?, sewerage = ?,
        commercial_type = ?, business_hours = ?, additional_amenities = ?,
        photos = ?, videos = ?, additional_documents = ?,
        ownership_document = ?, no_debts_document = ?,
        test_drive = ?, test_drive_data = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    
    return stmt.run(
      propertyData.title,
      propertyData.description || null,
      propertyData.price || null,
      propertyData.currency || 'USD',
      propertyData.is_auction ? 1 : 0,
      propertyData.auction_start_date || null,
      propertyData.auction_end_date || null,
      propertyData.auction_starting_price || null,
      propertyData.area || null,
      propertyData.living_area || null,
      propertyData.building_type || null,
      propertyData.rooms || null,
      propertyData.bathrooms || null,
      propertyData.floor || null,
      propertyData.total_floors || null,
      propertyData.year_built || null,
      propertyData.location || null,
      propertyData.address || null,
      propertyData.apartment || null,
      propertyData.country || null,
      propertyData.city || null,
      propertyData.coordinates ? JSON.stringify(propertyData.coordinates) : null,
      JSON.stringify(amenities),
      propertyData.renovation || null,
      propertyData.condition || null,
      propertyData.heating || null,
      propertyData.water_supply || null,
      propertyData.sewerage || null,
      propertyData.commercial_type || null,
      propertyData.business_hours || null,
      propertyData.additional_amenities || null,
      propertyData.photos ? JSON.stringify(propertyData.photos) : null,
      propertyData.videos ? JSON.stringify(propertyData.videos) : null,
      propertyData.additional_documents ? JSON.stringify(propertyData.additional_documents) : null,
      propertyData.ownership_document || null,
      propertyData.no_debts_document || null,
      propertyData.test_drive ? 1 : 0,
      propertyData.test_drive_data ? JSON.stringify(propertyData.test_drive_data) : null,
      id
    );
  },

  /**
   * Удалить квартиру/апартамент
   */
  delete: (id) => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM properties_apartments WHERE id = ?');
    return stmt.run(id);
  },

  /**
   * Обновить статус модерации
   */
  updateModerationStatus: (id, status, reviewedBy = null, rejectionReason = null, debtSeverity = null) => {
    const db = getDatabase();
    console.log(`🏢 apartmentQueries.updateModerationStatus: обновление properties_apartments, ID=${id}, status=${status}`);
    const stmt = db.prepare(`
      UPDATE properties_apartments 
      SET moderation_status = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP, rejection_reason = ?, 
          debt_severity = COALESCE(?, debt_severity)
      WHERE id = ?
    `);
    const result = stmt.run(status, reviewedBy, rejectionReason, debtSeverity, id);
    console.log(`✅ apartmentQueries.updateModerationStatus: обновлено в properties_apartments, ID=${id}, changes=${result.changes}`);
    return result;
  },

  /**
   * Забронировать объект на 72 часа
   */
  reserve: (id, userId, purchaseRequestId) => {
    const db = getDatabase();
    const reservedUntil = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(); // +72 часа
    const stmt = db.prepare(`
      UPDATE properties_apartments 
      SET reserved_until = ?, reserved_by = ?, purchase_request_id = ?
      WHERE id = ?
    `);
    return stmt.run(reservedUntil, userId, purchaseRequestId, id);
  },

  /**
   * Снять бронь с объекта
   */
  unreserve: (id) => {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE properties_apartments 
      SET reserved_until = NULL, reserved_by = NULL, purchase_request_id = NULL
      WHERE id = ?
    `);
    return stmt.run(id);
  },

  /**
   * Проверить, забронирован ли объект
   */
  isReserved: (id) => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT reserved_until, reserved_by, purchase_request_id 
      FROM properties_apartments 
      WHERE id = ?
    `);
    const result = stmt.get(id);
    
    if (!result || !result.reserved_until) {
      return { isReserved: false };
    }
    
    const reservedUntil = new Date(result.reserved_until);
    const now = new Date();
    
    // Если бронь истекла, автоматически снимаем её
    if (reservedUntil < now) {
      apartmentQueries.unreserve(id);
      return { isReserved: false };
    }
    
    return {
      isReserved: true,
      reservedUntil: result.reserved_until,
      reservedBy: result.reserved_by,
      purchaseRequestId: result.purchase_request_id,
      timeRemaining: reservedUntil - now
    };
  }
};

// ========== ФУНКЦИИ ДЛЯ РАБОТЫ С ДОМАМИ/ВИЛЛАМИ ==========

export const houseQueries = {
  /**
   * Создать новое объявление о доме/вилле
   */
  create: (propertyData) => {
    ensureHousesTable();
    const db = getDatabase();
    
    // Формируем JSON массив удобств
    // ВАЖНО: Добавляем в массив ТОЛЬКО те удобства, которые явно выбраны пользователем (равны 1 или true)
    const amenities = [];
    
    // Основные удобства - проверяем строго (только 1 или true, не 0, не undefined, не '0')
    if (propertyData.pool === 1 || propertyData.pool === true || propertyData.pool === '1') {
      amenities.push('pool');
    }
    if (propertyData.garden === 1 || propertyData.garden === true || propertyData.garden === '1') {
      amenities.push('garden');
    }
    if (propertyData.garage === 1 || propertyData.garage === true || propertyData.garage === '1') {
      amenities.push('garage');
    }
    if (propertyData.parking === 1 || propertyData.parking === true || propertyData.parking === '1') {
      amenities.push('parking');
    }
    if (propertyData.electricity === 1 || propertyData.electricity === true || propertyData.electricity === '1') {
      amenities.push('electricity');
    }
    if (propertyData.internet === 1 || propertyData.internet === true || propertyData.internet === '1') {
      amenities.push('internet');
    }
    if (propertyData.security === 1 || propertyData.security === true || propertyData.security === '1') {
      amenities.push('security');
    }
    if (propertyData.furniture === 1 || propertyData.furniture === true || propertyData.furniture === '1') {
      amenities.push('furniture');
    }
    
    // Добавляем feature поля в массив удобств - проверяем строго
    for (let i = 1; i <= 26; i++) {
      const featureKey = `feature${i}`;
      const featureValue = propertyData[featureKey];
      if (featureValue === 1 || featureValue === true || featureValue === '1') {
        amenities.push(featureKey);
      }
    }
    
    const stmt = db.prepare(`
      INSERT INTO properties_houses (
        user_id, property_type, title, description, price, currency,
        is_auction, auction_start_date, auction_end_date, auction_starting_price,
        area, living_area, land_area, building_type, bedrooms, bathrooms, floors, year_built,
        location, address, country, city, coordinates,
        amenities, renovation, condition, heating, water_supply, sewerage,
        additional_amenities,
        photos, videos, additional_documents,
        ownership_document, no_debts_document,
        test_drive, test_drive_data,
        is_shared_ownership, total_shares, shares_sold,
        moderation_status, sale_type, is_debt, has_debt,
        debt_utilities, debt_mortgage_pledge, debt_property_taxes,
        debt_arrest, debt_inherited, debt_third_party, debt_other, debt_amount
      ) VALUES (
        ?, ?, ?, ?, ?, ?,        -- user_id ... currency
        ?, ?, ?, ?,              -- is_auction ... auction_starting_price
        ?, ?, ?, ?, ?, ?, ?, ?,  -- area ... year_built
        ?, ?, ?, ?, ?,           -- location ... coordinates (5 колонок)
        ?, ?, ?, ?, ?, ?,        -- amenities ... sewerage
        ?,                       -- additional_amenities
        ?, ?, ?,                 -- photos, videos, additional_documents
        ?, ?,                    -- ownership_document, no_debts_document
        ?, ?,                    -- test_drive, test_drive_data
        ?, ?, ?,                 -- is_shared_ownership, total_shares, shares_sold
        ?, ?, ?, ?,              -- moderation_status, sale_type, is_debt, has_debt
        ?, ?, ?, ?, ?, ?, ?, ?   -- debt_* (8 полей)
      )
    `);
    
    return stmt.run(
      propertyData.user_id,
      propertyData.property_type,
      propertyData.title,
      propertyData.description || null,
      propertyData.price || null,
      propertyData.currency || 'USD',
      propertyData.is_auction ? 1 : 0,
      propertyData.auction_start_date || null,
      propertyData.auction_end_date || null,
      propertyData.auction_starting_price || null,
      propertyData.area || null,
      propertyData.living_area || null,
      propertyData.land_area || null,
      propertyData.building_type || null,
      (() => {
        // Обрабатываем bedrooms: проверяем на валидность и преобразуем в число
        if (propertyData.bedrooms !== undefined && propertyData.bedrooms !== null && propertyData.bedrooms !== '') {
          const parsedBedrooms = typeof propertyData.bedrooms === 'number' 
            ? propertyData.bedrooms 
            : parseInt(propertyData.bedrooms, 10);
          // Проверяем, что это валидное число (не NaN и конечное)
          if (!isNaN(parsedBedrooms) && isFinite(parsedBedrooms)) {
            return parsedBedrooms;
          }
        }
        return null;
      })(),
      propertyData.bathrooms || null,
      propertyData.floors || null, // Количество этажей дома
      propertyData.year_built || null,
      propertyData.location || null,
      propertyData.address || null,
      propertyData.country || null,
      propertyData.city || null,
      propertyData.coordinates ? JSON.stringify(propertyData.coordinates) : null,
      JSON.stringify(amenities),
      propertyData.renovation || null,
      propertyData.condition || null,
      propertyData.heating || null,
      propertyData.water_supply || null,
      propertyData.sewerage || null,
      propertyData.additional_amenities || null,
      propertyData.photos ? JSON.stringify(propertyData.photos) : null,
      propertyData.videos ? JSON.stringify(propertyData.videos) : null,
      propertyData.additional_documents ? JSON.stringify(propertyData.additional_documents) : null,
      propertyData.ownership_document || null,
      propertyData.no_debts_document || null,
      propertyData.test_drive ? 1 : 0,
      propertyData.test_drive_data ? JSON.stringify(propertyData.test_drive_data) : null,
      propertyData.is_shared_ownership ? 1 : 0,
      propertyData.total_shares || null,
      propertyData.shares_sold != null ? propertyData.shares_sold : 0,
      propertyData.moderation_status || 'pending',
      propertyData.sale_type || null,
      propertyData.is_debt ? 1 : 0,
      propertyData.has_debt ? 1 : 0,
      propertyData.debt_utilities ? 1 : 0,
      propertyData.debt_mortgage_pledge ? 1 : 0,
      propertyData.debt_property_taxes ? 1 : 0,
      propertyData.debt_arrest ? 1 : 0,
      propertyData.debt_inherited ? 1 : 0,
      propertyData.debt_third_party ? 1 : 0,
      propertyData.debt_other || null,
      propertyData.debt_amount != null ? propertyData.debt_amount : null
    );
  },

  /**
   * Получить дом/виллу по ID
   */
  getById: (id) => {
    ensureHousesTable();
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM properties_houses WHERE id = ?');
    const property = stmt.get(id);
    
    // КРИТИЧЕСКАЯ ПРОВЕРКА: Проверяем, что property_type соответствует таблице houses
    if (property) {
      if (property.property_type !== 'house' && property.property_type !== 'villa') {
        console.error(`❌ houseQueries.getById: КРИТИЧЕСКАЯ ОШИБКА! Объект ID=${id} найден в properties_houses, но property_type=${property.property_type} не соответствует таблице!`);
        console.error(`   Объект с типом ${property.property_type} не должен находиться в таблице properties_houses!`);
        console.error(`   Это означает, что объект был неправильно сохранен в базу данных.`);
        return null;
      }
      // Парсим JSON поля с безопасной обработкой ошибок
      if (property.amenities) {
        try {
          property.amenities = JSON.parse(property.amenities);
        } catch (e) {
          console.warn('⚠️ Ошибка парсинга amenities для property ID', id, ':', e.message);
          property.amenities = [];
        }
      }
      if (property.coordinates) {
        try {
          property.coordinates = JSON.parse(property.coordinates);
        } catch (e) {
          console.warn('⚠️ Ошибка парсинга coordinates для property ID', id, ':', e.message);
          property.coordinates = null;
        }
      }
      if (property.photos) {
        try {
          property.photos = JSON.parse(property.photos);
        } catch (e) {
          console.warn('⚠️ Ошибка парсинга photos для property ID', id, ':', e.message);
          property.photos = [];
        }
      }
      if (property.videos) {
        try {
          property.videos = JSON.parse(property.videos);
        } catch (e) {
          console.warn('⚠️ Ошибка парсинга videos для property ID', id, ':', e.message);
          property.videos = [];
        }
      }
      if (property.additional_documents) {
        try {
          property.additional_documents = JSON.parse(property.additional_documents);
        } catch (e) {
          console.warn('⚠️ Ошибка парсинга additional_documents для property ID', id, ':', e.message);
          console.warn('⚠️ Содержимое additional_documents:', property.additional_documents);
          property.additional_documents = [];
        }
      }
      if (property.test_drive_data) {
        try {
          property.test_drive_data = JSON.parse(property.test_drive_data);
        } catch (e) {
          console.warn('⚠️ Ошибка парсинга test_drive_data для property ID', id, ':', e.message);
          property.test_drive_data = null;
        }
      }
    }
    
    return property;
  },

  /**
   * Получить все дома/виллы пользователя
   */
  getByUserId: (userId, limit = 50, offset = 0) => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM properties_houses 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `);
    const properties = stmt.all(userId, limit, offset);
    
    // Парсим JSON поля
    return properties.map(property => {
      if (property.amenities) property.amenities = JSON.parse(property.amenities);
      if (property.coordinates) property.coordinates = JSON.parse(property.coordinates);
      if (property.photos) property.photos = JSON.parse(property.photos);
      if (property.videos) property.videos = JSON.parse(property.videos);
      if (property.additional_documents) property.additional_documents = JSON.parse(property.additional_documents);
      if (property.test_drive_data) property.test_drive_data = JSON.parse(property.test_drive_data);
      return property;
    });
  },

  /**
   * Получить все дома/виллы с фильтрами
   */
  getAll: (filters = {}, limit = 100, offset = 0) => {
    const db = getDatabase();
    let query = 'SELECT * FROM properties_houses WHERE 1=1';
    const params = [];

    if (filters.moderation_status) {
      query += ' AND moderation_status = ?';
      params.push(filters.moderation_status);
    }

    if (filters.property_type) {
      query += ' AND property_type = ?';
      params.push(filters.property_type);
    }

    if (filters.is_shared_ownership === 1 || filters.is_shared_ownership === true) {
      query += ' AND is_shared_ownership = 1';
    }

    if (filters.city) {
      query += ' AND city = ?';
      params.push(filters.city);
    }
    
    if (filters.country) {
      query += ' AND country = ?';
      params.push(filters.country);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    const stmt = db.prepare(query);
    const properties = stmt.all(...params);
    
    // Парсим JSON поля
    return properties.map(property => {
      if (property.amenities) property.amenities = JSON.parse(property.amenities);
      if (property.coordinates) property.coordinates = JSON.parse(property.coordinates);
      if (property.photos) property.photos = JSON.parse(property.photos);
      if (property.videos) property.videos = JSON.parse(property.videos);
      if (property.additional_documents) property.additional_documents = JSON.parse(property.additional_documents);
      if (property.test_drive_data) property.test_drive_data = JSON.parse(property.test_drive_data);
      return property;
    });
  },

  /**
   * Обновить дом/виллу
   */
  update: (id, propertyData) => {
    const db = getDatabase();
    
    // Формируем JSON массив удобств
    // ВАЖНО: Добавляем в массив ТОЛЬКО те удобства, которые явно выбраны пользователем (равны 1 или true)
    const amenities = [];
    
    // Основные удобства - проверяем строго (только 1 или true, не 0, не undefined, не '0')
    if (propertyData.pool === 1 || propertyData.pool === true || propertyData.pool === '1') {
      amenities.push('pool');
    }
    if (propertyData.garden === 1 || propertyData.garden === true || propertyData.garden === '1') {
      amenities.push('garden');
    }
    if (propertyData.garage === 1 || propertyData.garage === true || propertyData.garage === '1') {
      amenities.push('garage');
    }
    if (propertyData.parking === 1 || propertyData.parking === true || propertyData.parking === '1') {
      amenities.push('parking');
    }
    if (propertyData.electricity === 1 || propertyData.electricity === true || propertyData.electricity === '1') {
      amenities.push('electricity');
    }
    if (propertyData.internet === 1 || propertyData.internet === true || propertyData.internet === '1') {
      amenities.push('internet');
    }
    if (propertyData.security === 1 || propertyData.security === true || propertyData.security === '1') {
      amenities.push('security');
    }
    if (propertyData.furniture === 1 || propertyData.furniture === true || propertyData.furniture === '1') {
      amenities.push('furniture');
    }
    
    // Добавляем feature поля в массив удобств - проверяем строго
    for (let i = 1; i <= 26; i++) {
      const featureKey = `feature${i}`;
      const featureValue = propertyData[featureKey];
      if (featureValue === 1 || featureValue === true || featureValue === '1') {
        amenities.push(featureKey);
      }
    }
    
    const stmt = db.prepare(`
      UPDATE properties_houses SET
        title = ?, description = ?, price = ?, currency = ?,
        is_auction = ?, auction_start_date = ?, auction_end_date = ?, auction_starting_price = ?,
        area = ?, living_area = ?, land_area = ?, building_type = ?, bedrooms = ?, bathrooms = ?, 
        floors = ?, year_built = ?,
        location = ?, address = ?, country = ?, city = ?, coordinates = ?,
        amenities = ?, renovation = ?, condition = ?, heating = ?, water_supply = ?, sewerage = ?,
        additional_amenities = ?,
        photos = ?, videos = ?, additional_documents = ?,
        ownership_document = ?, no_debts_document = ?,
        test_drive = ?, test_drive_data = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    
    return stmt.run(
      propertyData.title,
      propertyData.description || null,
      propertyData.price || null,
      propertyData.currency || 'USD',
      propertyData.is_auction ? 1 : 0,
      propertyData.auction_start_date || null,
      propertyData.auction_end_date || null,
      propertyData.auction_starting_price || null,
      propertyData.area || null,
      propertyData.living_area || null,
      propertyData.land_area || null,
      propertyData.building_type || null,
      (() => {
        // Обрабатываем bedrooms: проверяем на валидность и преобразуем в число
        if (propertyData.bedrooms !== undefined && propertyData.bedrooms !== null && propertyData.bedrooms !== '') {
          const parsedBedrooms = typeof propertyData.bedrooms === 'number' 
            ? propertyData.bedrooms 
            : parseInt(propertyData.bedrooms, 10);
          // Проверяем, что это валидное число (не NaN и конечное)
          if (!isNaN(parsedBedrooms) && isFinite(parsedBedrooms)) {
            return parsedBedrooms;
          }
        }
        return null;
      })(),
      propertyData.bathrooms || null,
      propertyData.floors || null,
      propertyData.year_built || null,
      propertyData.location || null,
      propertyData.address || null,
      propertyData.country || null,
      propertyData.city || null,
      propertyData.coordinates ? JSON.stringify(propertyData.coordinates) : null,
      JSON.stringify(amenities),
      propertyData.renovation || null,
      propertyData.condition || null,
      propertyData.heating || null,
      propertyData.water_supply || null,
      propertyData.sewerage || null,
      propertyData.additional_amenities || null,
      propertyData.photos ? JSON.stringify(propertyData.photos) : null,
      propertyData.videos ? JSON.stringify(propertyData.videos) : null,
      propertyData.additional_documents ? JSON.stringify(propertyData.additional_documents) : null,
      propertyData.ownership_document || null,
      propertyData.no_debts_document || null,
      propertyData.test_drive ? 1 : 0,
      propertyData.test_drive_data ? JSON.stringify(propertyData.test_drive_data) : null,
      id
    );
  },

  /**
   * Удалить дом/виллу
   */
  delete: (id) => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM properties_houses WHERE id = ?');
    return stmt.run(id);
  },

  /**
   * Обновить статус модерации
   */
  updateModerationStatus: (id, status, reviewedBy = null, rejectionReason = null, debtSeverity = null) => {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE properties_houses 
      SET moderation_status = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP, rejection_reason = ?,
          debt_severity = COALESCE(?, debt_severity)
      WHERE id = ?
    `);
    return stmt.run(status, reviewedBy, rejectionReason, debtSeverity, id);
  },

  /**
   * Забронировать объект на 72 часа
   */
  reserve: (id, userId, purchaseRequestId) => {
    const db = getDatabase();
    const reservedUntil = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(); // +72 часа
    const stmt = db.prepare(`
      UPDATE properties_houses 
      SET reserved_until = ?, reserved_by = ?, purchase_request_id = ?
      WHERE id = ?
    `);
    return stmt.run(reservedUntil, userId, purchaseRequestId, id);
  },

  /**
   * Снять бронь с объекта
   */
  unreserve: (id) => {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE properties_houses 
      SET reserved_until = NULL, reserved_by = NULL, purchase_request_id = NULL
      WHERE id = ?
    `);
    return stmt.run(id);
  },

  /**
   * Проверить, забронирован ли объект
   */
  isReserved: (id) => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT reserved_until, reserved_by, purchase_request_id 
      FROM properties_houses 
      WHERE id = ?
    `);
    const result = stmt.get(id);
    
    if (!result || !result.reserved_until) {
      return { isReserved: false };
    }
    
    const reservedUntil = new Date(result.reserved_until);
    const now = new Date();
    
    // Если бронь истекла, автоматически снимаем её
    if (reservedUntil < now) {
      houseQueries.unreserve(id);
      return { isReserved: false };
    }
    
    return {
      isReserved: true,
      reservedUntil: result.reserved_until,
      reservedBy: result.reserved_by,
      purchaseRequestId: result.purchase_request_id,
      timeRemaining: reservedUntil - now
    };
  }
};

// ========== УНИВЕРСАЛЬНЫЕ ФУНКЦИИ ДЛЯ РАБОТЫ СО ВСЕЙ НЕДВИЖИМОСТЬЮ ==========

/**
 * Получить всю недвижимость из обеих таблиц (apartments и houses)
 * Объединяет результаты и возвращает в едином формате
 */
export const propertyQueries = {
  /**
   * Получить все объекты недвижимости с фильтрами
   */
  getAll: (filters = {}, limit = 100, offset = 0) => {
    const db = getDatabase();
    
    // Проверяем существование новых таблиц
    let useNewTables = false;
    try {
      db.prepare('SELECT 1 FROM properties_apartments LIMIT 1').get();
      db.prepare('SELECT 1 FROM properties_houses LIMIT 1').get();
      useNewTables = true;
    } catch (e) {
      useNewTables = false;
    }
    
    if (useNewTables) {
      // Используем новые таблицы
      const apartments = apartmentQueries.getAll(filters, limit, offset);
      const houses = houseQueries.getAll(filters, limit, offset);
      
      // Объединяем и сортируем по дате создания
      const allProperties = [...apartments, ...houses].sort((a, b) => {
        return new Date(b.created_at) - new Date(a.created_at);
      });
      
      return allProperties.slice(0, limit);
    } else {
      // Fallback на старую таблицу
      let query = 'SELECT * FROM properties WHERE 1=1';
      const params = [];
      
      if (filters.moderation_status) {
        query += ' AND moderation_status = ?';
        params.push(filters.moderation_status);
      }
      
      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);
      
      const stmt = db.prepare(query);
      return stmt.all(...params);
    }
  },

  /**
   * Получить количество всех объектов
   */
  getCount: (filters = {}) => {
    const db = getDatabase();
    
    // Проверяем существование новых таблиц
    let useNewTables = false;
    try {
      db.prepare('SELECT 1 FROM properties_apartments LIMIT 1').get();
      db.prepare('SELECT 1 FROM properties_houses LIMIT 1').get();
      useNewTables = true;
    } catch (e) {
      useNewTables = false;
    }
    
    if (useNewTables) {
      let apartmentQuery = 'SELECT COUNT(*) as count FROM properties_apartments WHERE 1=1';
      let houseQuery = 'SELECT COUNT(*) as count FROM properties_houses WHERE 1=1';
      const params = [];
      
      if (filters.moderation_status) {
        apartmentQuery += ' AND moderation_status = ?';
        houseQuery += ' AND moderation_status = ?';
        params.push(filters.moderation_status);
      }
      
      const apartmentCount = db.prepare(apartmentQuery).get(...params).count || 0;
      const houseCount = db.prepare(houseQuery).get(...params).count || 0;
      
      return apartmentCount + houseCount;
    } else {
      // Fallback на старую таблицу
      let query = 'SELECT COUNT(*) as count FROM properties WHERE 1=1';
      const params = [];
      
      if (filters.moderation_status) {
        query += ' AND moderation_status = ?';
        params.push(filters.moderation_status);
      }
      
      const result = db.prepare(query).get(...params);
      return result.count || 0;
    }
  },

  /**
   * Количество одобренных объектов (выставленных)
   */
  getApprovedCount: () => {
    return propertyQueries.getCount({ moderation_status: 'approved' });
  },

  /**
   * Количество одобренных аукционов
   */
  getAuctionsCount: () => {
    const db = getDatabase();
    let useNewTables = false;
    try {
      db.prepare('SELECT 1 FROM properties_apartments LIMIT 1').get();
      db.prepare('SELECT 1 FROM properties_houses LIMIT 1').get();
      useNewTables = true;
    } catch (e) {
      useNewTables = false;
    }
    if (useNewTables) {
      const apt = db.prepare(`
        SELECT COUNT(*) as c FROM properties_apartments
        WHERE moderation_status = 'approved' AND (is_auction = 1 OR is_auction = '1')
      `).get();
      const house = db.prepare(`
        SELECT COUNT(*) as c FROM properties_houses
        WHERE moderation_status = 'approved' AND (is_auction = 1 OR is_auction = '1')
      `).get();
      return (apt?.c || 0) + (house?.c || 0);
    }
    const r = db.prepare(`
      SELECT COUNT(*) as c FROM properties
      WHERE moderation_status = 'approved' AND (is_auction = 1 OR is_auction = '1')
    `).get();
    return r?.c || 0;
  },

  /**
   * Статистика одобренных объектов по типу недвижимости (для графика «Категории недвижимости»)
   * Возвращает: [{ type: 'villa'|'house'|'apartment'|'commercial', count }, ...]
   */
  getCategoryStatsByType: () => {
    const db = getDatabase();
    let useNewTables = false;
    try {
      db.prepare('SELECT 1 FROM properties_apartments LIMIT 1').get();
      db.prepare('SELECT 1 FROM properties_houses LIMIT 1').get();
      useNewTables = true;
    } catch (e) {
      return [];
    }
    const result = [];
    const apt = db.prepare(`
      SELECT property_type, COUNT(*) as count FROM properties_apartments
      WHERE moderation_status = 'approved'
      GROUP BY property_type
    `).all();
    const house = db.prepare(`
      SELECT property_type, COUNT(*) as count FROM properties_houses
      WHERE moderation_status = 'approved'
      GROUP BY property_type
    `).all();
    const order = ['villa', 'house', 'apartment', 'commercial'];
    const map = {};
    apt.forEach((r) => { map[r.property_type] = (map[r.property_type] || 0) + r.count; });
    house.forEach((r) => { map[r.property_type] = (map[r.property_type] || 0) + r.count; });
    order.forEach((t) => { if (map[t] != null) result.push({ type: t, count: map[t] }); });
    return result;
  },

  /**
   * Статистика одобренных объектов по разделам: Аукцион, Купить сейчас, Доли, Долги
   * Возвращает: [{ section: 'auction'|'buy_now'|'share'|'debt', count }, ...]
   */
  getCategoryStatsBySection: () => {
    const db = getDatabase();
    let useNewTables = false;
    try {
      db.prepare('SELECT 1 FROM properties_apartments LIMIT 1').get();
      db.prepare('SELECT 1 FROM properties_houses LIMIT 1').get();
      useNewTables = true;
    } catch (e) {
      return [];
    }
    const tables = ['properties_apartments', 'properties_houses'];
    const debt = tables.reduce((sum, t) => {
      const r = db.prepare(`
        SELECT COUNT(*) as c FROM ${t}
        WHERE moderation_status = 'approved'
        AND (sale_type = 'debt' OR is_debt = 1 OR has_debt = 1)
      `).get();
      return sum + (r?.c || 0);
    }, 0);
    const auction = tables.reduce((sum, t) => {
      const r = db.prepare(`
        SELECT COUNT(*) as c FROM ${t}
        WHERE moderation_status = 'approved'
        AND (is_auction = 1 OR is_auction = '1')
        AND (sale_type IS NULL OR sale_type != 'debt')
        AND (is_debt IS NULL OR is_debt = 0)
        AND (has_debt IS NULL OR has_debt = 0)
      `).get();
      return sum + (r?.c || 0);
    }, 0);
    const share = tables.reduce((sum, t) => {
      const r = db.prepare(`
        SELECT COUNT(*) as c FROM ${t}
        WHERE moderation_status = 'approved'
        AND (sale_type = 'share' OR is_shared_ownership = 1)
        AND (is_auction IS NULL OR is_auction = 0 OR is_auction = '0')
        AND (sale_type IS NULL OR sale_type != 'debt')
        AND (is_debt IS NULL OR is_debt = 0)
        AND (has_debt IS NULL OR has_debt = 0)
      `).get();
      return sum + (r?.c || 0);
    }, 0);
    const totalApproved = tables.reduce((sum, t) => {
      const r = db.prepare(`SELECT COUNT(*) as c FROM ${t} WHERE moderation_status = 'approved'`).get();
      return sum + (r?.c || 0);
    }, 0);
    const buyNow = Math.max(0, totalApproved - debt - auction - share);
    const out = [];
    if (auction > 0) out.push({ section: 'auction', count: auction });
    if (buyNow > 0) out.push({ section: 'buy_now', count: buyNow });
    if (share > 0) out.push({ section: 'share', count: share });
    if (debt > 0) out.push({ section: 'debt', count: debt });
    return out;
  },

  /**
   * Получить все одобренные объекты долевой собственности (из обеих таблиц)
   */
  getShares: (limit = 100, offset = 0) => {
    const apartments = apartmentQueries.getAll(
      { moderation_status: 'approved', is_shared_ownership: 1 },
      limit,
      offset
    );
    const houses = houseQueries.getAll(
      { moderation_status: 'approved', is_shared_ownership: 1 },
      limit,
      offset
    );
    const combined = [...apartments, ...houses].sort((a, b) => {
      return new Date(b.created_at) - new Date(a.created_at);
    });
    return combined.slice(0, limit);
  },

  /**
   * Получить объекты конкретного пользователя
   */
  getByUserId: (userId, limit = 50, offset = 0) => {
    const db = getDatabase();
    
    // Проверяем существование новых таблиц (через sqlite_master)
    let useNewTables = false;
    try {
      const hasApartments = db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='properties_apartments'").get();
      const hasHouses = db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='properties_houses'").get();
      useNewTables = !!(hasApartments && hasHouses);
      if (!useNewTables) {
        console.warn('⚠️ getByUserId: таблицы properties_apartments или properties_houses отсутствуют — объявления читаются из старой таблицы properties');
      }
    } catch (e) {
      useNewTables = false;
      console.warn('⚠️ getByUserId: ошибка проверки таблиц:', e.message);
    }
    
    if (useNewTables) {
      const apartments = apartmentQueries.getByUserId(userId, limit, offset);
      const houses = houseQueries.getByUserId(userId, limit, offset);
      
      // Объединяем и сортируем
      const allProperties = [...apartments, ...houses].sort((a, b) => {
        return new Date(b.created_at) - new Date(a.created_at);
      });
      
      return allProperties.slice(0, limit);
    } else {
      // Fallback на старую таблицу
      const stmt = db.prepare('SELECT * FROM properties WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?');
      return stmt.all(userId, limit, offset);
    }
  },

  /**
   * Получить объект по ID (ищет в обеих таблицах)
   */
  getById: (id, propertyType = null) => {
    const db = getDatabase();
    
    // Проверяем существование новых таблиц
    let useNewTables = false;
    try {
      db.prepare('SELECT 1 FROM properties_apartments LIMIT 1').get();
      db.prepare('SELECT 1 FROM properties_houses LIMIT 1').get();
      useNewTables = true;
    } catch (e) {
      useNewTables = false;
    }
    
    if (useNewTables) {
      // ВАЖНО: Если известен тип, ищем ТОЛЬКО в правильной таблице
      if (propertyType === 'apartment' || propertyType === 'commercial') {
        console.log(`🔍 getById: поиск в properties_apartments для ID=${id}, запрошенный тип=${propertyType}`);
        const property = apartmentQueries.getById(id);
        if (property) {
          const pt = property.property_type;
          // Квартира и commercial хранятся в одной таблице — запрос с типом apartment при объекте commercial (и наоборот) допустим
          if (pt === 'apartment' || pt === 'commercial') {
            property.source_table = 'properties_apartments';
            console.log(`✅ getById: найден объект в apartments, ID=${id}, type=${pt}`);
            return property;
          }
          console.error(`❌ getById: объект ID=${id} в apartments имеет неожиданный property_type=${pt}`);
          return null;
        }
        console.warn(`⚠️ getById: объект ID=${id} не найден в properties_apartments для типа ${propertyType}`);
        return null;
      } else if (propertyType === 'house' || propertyType === 'villa') {
        console.log(`🔍 getById: поиск в properties_houses для ID=${id}, запрошенный тип=${propertyType}`);
        const property = houseQueries.getById(id);
        if (property) {
          const pt = property.property_type;
          if (pt === 'house' || pt === 'villa') {
            property.source_table = 'properties_houses';
            console.log(`✅ getById: найден объект в houses, ID=${id}, type=${pt}`);
            return property;
          }
          console.error(`❌ getById: объект ID=${id} в houses имеет неожиданный property_type=${pt}`);
          return null;
        } else {
          console.warn(`⚠️ getById: объект ID=${id} не найден в properties_houses для типа ${propertyType}`);
          return null;
        }
      }
      
      // Если тип неизвестен, ищем в обеих таблицах ПАРАЛЛЕЛЬНО
      // ВАЖНО: Проверяем обе таблицы одновременно и выбираем правильную по property_type
      const propertyInHouses = houseQueries.getById(id);
      const propertyInApartments = apartmentQueries.getById(id);
      
      console.log(`🔍 getById: поиск ID=${id}:`, {
        in_houses: !!propertyInHouses,
        in_apartments: !!propertyInApartments,
        houses_type: propertyInHouses?.property_type,
        apartments_type: propertyInApartments?.property_type
      });
      
      // Если объект найден в обеих таблицах (дубликат), выбираем правильную по property_type
      if (propertyInHouses && propertyInApartments) {
        console.warn(`⚠️ getById: объект ID=${id} найден в обеих таблицах! Выбираем правильную по property_type.`);
        
        // Проверяем property_type и выбираем правильную таблицу
        if (propertyInHouses.property_type === 'house' || propertyInHouses.property_type === 'villa') {
          console.log(`✅ getById: используем houses (property_type=${propertyInHouses.property_type})`);
          propertyInHouses.source_table = 'properties_houses';
          return propertyInHouses;
        } else if (propertyInApartments.property_type === 'apartment' || propertyInApartments.property_type === 'commercial') {
          console.log(`✅ getById: используем apartments (property_type=${propertyInApartments.property_type})`);
          propertyInApartments.source_table = 'properties_apartments';
          return propertyInApartments;
        } else {
          // Если property_type не соответствует ни одной таблице, возвращаем из той, где property_type правильный
          console.warn(`⚠️ getById: property_type не соответствует таблицам. Используем houses по умолчанию.`);
          propertyInHouses.source_table = 'properties_houses';
          return propertyInHouses;
        }
      }
      
      // Если найден только в одной таблице, проверяем соответствие property_type
      if (propertyInHouses) {
        if (propertyInHouses.property_type === 'house' || propertyInHouses.property_type === 'villa') {
          propertyInHouses.source_table = 'properties_houses';
          return propertyInHouses;
        } else {
          console.warn(`⚠️ getById: объект ID=${id} найден в houses, но property_type=${propertyInHouses.property_type} не соответствует! Игнорируем.`);
        }
      }
      
      if (propertyInApartments) {
        if (propertyInApartments.property_type === 'apartment' || propertyInApartments.property_type === 'commercial') {
          propertyInApartments.source_table = 'properties_apartments';
          return propertyInApartments;
        } else {
          console.warn(`⚠️ getById: объект ID=${id} найден в apartments, но property_type=${propertyInApartments.property_type} не соответствует! Игнорируем.`);
        }
      }
      
      // Если не нашли ни в одной таблице, возвращаем null
      return null;
    } else {
      // Fallback на старую таблицу
      const stmt = db.prepare('SELECT * FROM properties WHERE id = ?');
      const row = stmt.get(id);
      if (row) row.source_table = 'properties';
      return row;
    }
  },

  /**
   * Обновить статус модерации (работает с обеими таблицами)
   */
  updateModerationStatus: (id, status, reviewedBy = null, rejectionReason = null, debtSeverity = null) => {
    const db = getDatabase();
    
    // Проверяем существование новых таблиц
    let useNewTables = false;
    try {
      db.prepare('SELECT 1 FROM properties_apartments LIMIT 1').get();
      db.prepare('SELECT 1 FROM properties_houses LIMIT 1').get();
      useNewTables = true;
    } catch (e) {
      useNewTables = false;
    }
    
    if (useNewTables) {
      console.log(`🔍 updateModerationStatus: обновление ID=${id}, status=${status}`);
      
      // ВАЖНО: Сначала определяем, в какой таблице находится объект, проверяя property_type
      // Это предотвращает обновление объекта в неправильной таблице
      let propertyInHouses = null;
      let propertyInApartments = null;
      
      try {
        propertyInHouses = db.prepare('SELECT id, property_type FROM properties_houses WHERE id = ?').get(id);
      } catch (e) {
        // Игнорируем ошибку
      }
      
      try {
        propertyInApartments = db.prepare('SELECT id, property_type FROM properties_apartments WHERE id = ?').get(id);
      } catch (e) {
        // Игнорируем ошибку
      }
      
      console.log(`🔍 updateModerationStatus: проверка наличия объекта ID=${id}:`, {
        in_houses: !!propertyInHouses,
        in_apartments: !!propertyInApartments,
        houses_type: propertyInHouses?.property_type,
        apartments_type: propertyInApartments?.property_type
      });
      
      // Если объект найден в обеих таблицах (дубликат ID), определяем правильную таблицу по property_type
      if (propertyInHouses && propertyInApartments) {
        console.warn(`⚠️ updateModerationStatus: объект ID=${id} найден в обеих таблицах! Это дубликат ID.`);
        console.warn(`   houses: property_type=${propertyInHouses.property_type}, moderation_status=${propertyInHouses.moderation_status || 'NULL'}`);
        console.warn(`   apartments: property_type=${propertyInApartments.property_type}, moderation_status=${propertyInApartments.moderation_status || 'NULL'}`);
        
        // Определяем правильную таблицу по property_type
        if (propertyInHouses.property_type === 'house' || propertyInHouses.property_type === 'villa') {
          console.log(`✅ updateModerationStatus: используем houses (property_type=${propertyInHouses.property_type})`);
          // ВАЖНО: Удаляем дубликат из неправильной таблицы полностью
          try {
            console.log(`🗑️ Удаление дубликата из apartments для ID=${id} (неправильный property_type=${propertyInApartments.property_type})`);
            // Удаляем дубликат из неправильной таблицы - удаляем ВСЕ записи с этим ID, так как это дубликат
            const deleteResult = db.prepare('DELETE FROM properties_apartments WHERE id = ?').run(id);
            if (deleteResult.changes > 0) {
              console.log(`✅ Дубликат удален из apartments для ID=${id} (удалено записей: ${deleteResult.changes})`);
            } else {
              console.warn(`⚠️ Не удалось удалить дубликат из apartments для ID=${id}`);
            }
          } catch (e) {
            console.error(`❌ Ошибка при удалении дубликата из apartments:`, e.message);
          }
          propertyInApartments = null; // Игнорируем apartments
        } else if (propertyInApartments.property_type === 'apartment' || propertyInApartments.property_type === 'commercial') {
          console.log(`✅ updateModerationStatus: используем apartments (property_type=${propertyInApartments.property_type})`);
          // ВАЖНО: Удаляем дубликат из неправильной таблицы полностью
          try {
            console.log(`🗑️ Удаление дубликата из houses для ID=${id} (неправильный property_type=${propertyInHouses.property_type})`);
            // Удаляем дубликат из неправильной таблицы - удаляем ВСЕ записи с этим ID, так как это дубликат
            const deleteResult = db.prepare('DELETE FROM properties_houses WHERE id = ?').run(id);
            if (deleteResult.changes > 0) {
              console.log(`✅ Дубликат удален из houses для ID=${id} (удалено записей: ${deleteResult.changes})`);
            } else {
              console.warn(`⚠️ Не удалось удалить дубликат из houses для ID=${id}`);
            }
          } catch (e) {
            console.error(`❌ Ошибка при удалении дубликата из houses:`, e.message);
          }
          propertyInHouses = null; // Игнорируем houses
        } else {
          // Если property_type не соответствует ни одной таблице, используем ту, где moderation_status = 'pending'
          console.warn(`⚠️ updateModerationStatus: property_type не соответствует таблицам. Используем таблицу с pending статусом.`);
          if (propertyInHouses.moderation_status === 'pending') {
            propertyInApartments = null;
          } else if (propertyInApartments.moderation_status === 'pending') {
            propertyInHouses = null;
          }
        }
      }
      
      // Обновляем в правильной таблице
      let result = null;
      
      // Если объект найден в houses, проверяем что это действительно house или villa
      if (propertyInHouses) {
        // ВАЖНО: Проверяем, что property_type соответствует таблице houses
        if (propertyInHouses.property_type !== 'house' && propertyInHouses.property_type !== 'villa') {
          console.warn(`⚠️ updateModerationStatus: объект ID=${id} найден в houses, но property_type=${propertyInHouses.property_type} не соответствует таблице houses. Пропускаем обновление в houses.`);
          propertyInHouses = null; // Игнорируем houses, если property_type не соответствует
        } else {
          try {
            result = houseQueries.updateModerationStatus(id, status, reviewedBy, rejectionReason, debtSeverity);
            console.log(`📊 updateModerationStatus houses: changes=${result?.changes || 0}`);
            if (result && result.changes > 0) {
              console.log(`✅ updateModerationStatus: обновлено в houses, ID=${id}, type=${propertyInHouses.property_type}`);
              return result;
            } else if (result && result.changes === 0) {
              console.warn(`⚠️ updateModerationStatus: объект ID=${id} найден в houses, но changes=0. Возможно, статус уже был ${status}`);
              // Возвращаем результат даже если changes=0, так как статус может быть уже обновлен
              return result;
            }
          } catch (e) {
            console.error(`❌ updateModerationStatus: ошибка при обновлении houses, ID=${id}:`, e.message);
            throw new Error(`Ошибка при обновлении статуса модерации для объявления ID ${id} в houses: ${e.message}`);
          }
        }
      }
      
      // Если объект найден в apartments, проверяем что это действительно apartment или commercial
      if (propertyInApartments) {
        // ВАЖНО: Проверяем, что property_type соответствует таблице apartments
        if (propertyInApartments.property_type !== 'apartment' && propertyInApartments.property_type !== 'commercial') {
          console.warn(`⚠️ updateModerationStatus: объект ID=${id} найден в apartments, но property_type=${propertyInApartments.property_type} не соответствует таблице apartments. Пропускаем обновление в apartments.`);
          propertyInApartments = null; // Игнорируем apartments, если property_type не соответствует
        } else {
          try {
            console.log(`🏢 updateModerationStatus: обновление в таблице properties_apartments для ID=${id}, type=${propertyInApartments.property_type}, status=${status}`);
            result = apartmentQueries.updateModerationStatus(id, status, reviewedBy, rejectionReason, debtSeverity);
            console.log(`📊 updateModerationStatus apartments: changes=${result?.changes || 0}`);
            if (result && result.changes > 0) {
              console.log(`✅ updateModerationStatus: успешно обновлено в properties_apartments, ID=${id}, type=${propertyInApartments.property_type}, status=${status}`);
              return result;
            } else if (result && result.changes === 0) {
              console.warn(`⚠️ updateModerationStatus: объект ID=${id} найден в apartments, но changes=0. Возможно, статус уже был ${status}`);
              // Возвращаем результат даже если changes=0, так как статус может быть уже обновлен
              return result;
            }
          } catch (e) {
            console.error(`❌ updateModerationStatus: ошибка при обновлении apartments, ID=${id}:`, e.message);
            throw new Error(`Ошибка при обновлении статуса модерации для объявления ID ${id} в apartments: ${e.message}`);
          }
        }
      }
      
      // Если объект не найден ни в одной таблице
      console.error(`❌ updateModerationStatus: объект ID=${id} не найден ни в одной таблице`);
      throw new Error(`Объявление с ID ${id} не найдено ни в одной таблице`);
    } else {
      // Fallback на старую таблицу
      const stmt = db.prepare(`
        UPDATE properties 
        SET moderation_status = ?, 
            reviewed_by = ?, 
            reviewed_at = CURRENT_TIMESTAMP,
            rejection_reason = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      return stmt.run(status, reviewedBy, rejectionReason, id);
    }
  },

  /**
   * Удалить объявление (работает с обеими таблицами)
   */
  delete: (id) => {
    const db = getDatabase();
    
    // Проверяем существование новых таблиц
    let useNewTables = false;
    try {
      db.prepare('SELECT 1 FROM properties_apartments LIMIT 1').get();
      db.prepare('SELECT 1 FROM properties_houses LIMIT 1').get();
      useNewTables = true;
    } catch (e) {
      useNewTables = false;
    }
    
    if (useNewTables) {
      // Сначала пытаемся удалить из apartments
      try {
        const result = db.prepare('DELETE FROM properties_apartments WHERE id = ?').run(id);
        if (result.changes > 0) {
          return result;
        }
      } catch (e) {
        console.log('Не найдено в apartments, пробуем houses');
      }
      
      // Если не нашли в apartments, пробуем houses
      try {
        return db.prepare('DELETE FROM properties_houses WHERE id = ?').run(id);
      } catch (e) {
        throw new Error(`Объявление с ID ${id} не найдено ни в одной таблице`);
      }
    } else {
      // Fallback на старую таблицу
      return db.prepare('DELETE FROM properties WHERE id = ?').run(id);
    }
  },

  /**
   * Обновить объявление (работает с обеими таблицами)
   */
  update: (id, propertyData) => {
    // Сначала определяем тип объявления
    const property = propertyQueries.getById(id);
    if (!property) {
      throw new Error(`Объявление с ID ${id} не найдено`);
    }
    
    // В зависимости от типа вызываем соответствующий метод
    if (property.property_type === 'apartment' || property.property_type === 'commercial') {
      return apartmentQueries.update(id, propertyData);
    } else if (property.property_type === 'house' || property.property_type === 'villa') {
      return houseQueries.update(id, propertyData);
    } else {
      throw new Error(`Неизвестный тип объявления: ${property.property_type}`);
    }
  },

  /**
   * Получить объекты пользователя с информацией о пользователе
   */
  getUserProperties: (userId) => {
    const db = getDatabase();
    
    // Проверяем существование новых таблиц
    let useNewTables = false;
    try {
      db.prepare('SELECT 1 FROM properties_apartments LIMIT 1').get();
      db.prepare('SELECT 1 FROM properties_houses LIMIT 1').get();
      useNewTables = true;
    } catch (e) {
      useNewTables = false;
    }
    
    if (useNewTables) {
      // Получаем из обеих таблиц
      const apartmentsStmt = db.prepare(`
        SELECT 
          p.*,
          u.first_name,
          u.last_name,
          u.email,
          u.phone_number,
          u.role,
          'apartments' as source_table
        FROM properties_apartments p
        LEFT JOIN users u ON p.user_id = u.id
        WHERE p.user_id = ?
        ORDER BY p.created_at DESC
      `);
      
      const housesStmt = db.prepare(`
        SELECT 
          p.*,
          u.first_name,
          u.last_name,
          u.email,
          u.phone_number,
          u.role,
          'houses' as source_table
        FROM properties_houses p
        LEFT JOIN users u ON p.user_id = u.id
        WHERE p.user_id = ?
        ORDER BY p.created_at DESC
      `);
      
      const apartments = apartmentsStmt.all(userId);
      const houses = housesStmt.all(userId);
      
      // Объединяем и сортируем
      const allProperties = [...apartments, ...houses].sort((a, b) => {
        return new Date(b.created_at) - new Date(a.created_at);
      });
      
      // Парсим JSON поля
      return allProperties.map(property => {
        if (property.amenities) {
          try {
            property.amenities = JSON.parse(property.amenities);
          } catch (e) {
            property.amenities = [];
          }
        }
        if (property.coordinates) {
          try {
            property.coordinates = JSON.parse(property.coordinates);
          } catch (e) {
            property.coordinates = null;
          }
        }
        if (property.photos) {
          try {
            property.photos = JSON.parse(property.photos);
          } catch (e) {
            property.photos = [];
          }
        }
        if (property.videos) {
          try {
            property.videos = JSON.parse(property.videos);
          } catch (e) {
            property.videos = [];
          }
        }
        if (property.additional_documents) {
          try {
            property.additional_documents = JSON.parse(property.additional_documents);
          } catch (e) {
            property.additional_documents = [];
          }
        }
        if (property.test_drive_data) {
          try {
            property.test_drive_data = JSON.parse(property.test_drive_data);
          } catch (e) {
            property.test_drive_data = null;
          }
        }
        return property;
      });
    } else {
      // Fallback на старую таблицу
      const stmt = db.prepare(`
        SELECT 
          p.*,
          u.first_name,
          u.last_name,
          u.email,
          u.phone_number,
          u.role
        FROM properties p
        LEFT JOIN users u ON p.user_id = u.id
        WHERE p.user_id = ?
        ORDER BY p.created_at DESC
      `);
      return stmt.all(userId);
    }
  },

  /**
   * Забронировать объект на 72 часа
   */
  reserve: (id, userId, purchaseRequestId) => {
    console.log(`🔍 propertyQueries.reserve: резервация объекта ID=${id}, userId=${userId}, purchaseRequestId=${purchaseRequestId}`);
    
    const property = propertyQueries.getById(id);
    if (!property) {
      console.error(`❌ propertyQueries.reserve: объект с ID ${id} не найден`);
      throw new Error(`Объект с ID ${id} не найден`);
    }
    
    console.log(`🔍 propertyQueries.reserve: найден объект:`, {
      id: property.id,
      property_type: property.property_type,
      source_table: property.source_table,
      title: property.title
    });
    
    const sourceTable = property.source_table;
    if (!sourceTable) {
      // Если source_table не установлен, определяем по property_type
      console.log(`⚠️ propertyQueries.reserve: source_table не установлен, определяем по property_type`);
      if (property.property_type === 'apartment' || property.property_type === 'commercial') {
        console.log(`✅ propertyQueries.reserve: используем apartments (property_type=${property.property_type})`);
        return apartmentQueries.reserve(id, userId, purchaseRequestId);
      } else if (property.property_type === 'house' || property.property_type === 'villa') {
        console.log(`✅ propertyQueries.reserve: используем houses (property_type=${property.property_type})`);
        return houseQueries.reserve(id, userId, purchaseRequestId);
      } else {
        console.error(`❌ propertyQueries.reserve: неизвестный property_type=${property.property_type}`);
        throw new Error(`Неизвестный тип объекта: ${property.property_type}`);
      }
    }
    
    if (sourceTable === 'apartments') {
      console.log(`✅ propertyQueries.reserve: резервируем в apartments`);
      return apartmentQueries.reserve(id, userId, purchaseRequestId);
    } else if (sourceTable === 'houses') {
      console.log(`✅ propertyQueries.reserve: резервируем в houses`);
      return houseQueries.reserve(id, userId, purchaseRequestId);
    } else {
      console.error(`❌ propertyQueries.reserve: неизвестный source_table=${sourceTable}`);
      throw new Error(`Неизвестный тип объекта: source_table=${sourceTable}`);
    }
  },

  /**
   * Снять бронь с объекта
   */
  unreserve: (id) => {
    const property = propertyQueries.getById(id);
    if (!property) {
      throw new Error('Объект не найден');
    }
    
    const sourceTable = property.source_table;
    if (sourceTable === 'apartments') {
      return apartmentQueries.unreserve(id);
    } else if (sourceTable === 'houses') {
      return houseQueries.unreserve(id);
    } else {
      throw new Error('Неизвестный тип объекта');
    }
  },

  /**
   * Проверить, забронирован ли объект
   */
  isReserved: (id) => {
    const property = propertyQueries.getById(id);
    if (!property) {
      console.log(`🔍 propertyQueries.isReserved: объект с ID ${id} не найден`);
      return { isReserved: false };
    }
    
    const sourceTable = property.source_table;
    console.log(`🔍 propertyQueries.isReserved: проверка объекта ID=${id}, source_table=${sourceTable}, property_type=${property.property_type}`);
    
    if (!sourceTable) {
      // Если source_table не установлен, определяем по property_type
      if (property.property_type === 'apartment' || property.property_type === 'commercial') {
        const result = apartmentQueries.isReserved(id);
        console.log(`🔍 propertyQueries.isReserved: результат из apartments:`, result);
        return result;
      } else if (property.property_type === 'house' || property.property_type === 'villa') {
        const result = houseQueries.isReserved(id);
        console.log(`🔍 propertyQueries.isReserved: результат из houses:`, result);
        return result;
      } else {
        console.log(`⚠️ propertyQueries.isReserved: неизвестный property_type=${property.property_type}`);
        return { isReserved: false };
      }
    }
    
    if (sourceTable === 'apartments') {
      const result = apartmentQueries.isReserved(id);
      console.log(`🔍 propertyQueries.isReserved: результат из apartments:`, result);
      return result;
    } else if (sourceTable === 'houses') {
      const result = houseQueries.isReserved(id);
      console.log(`🔍 propertyQueries.isReserved: результат из houses:`, result);
      return result;
    } else {
      console.log(`⚠️ propertyQueries.isReserved: неизвестный source_table=${sourceTable}`);
      return { isReserved: false };
    }
  },

  /**
   * Получить одобренные объекты без аукциона
   */
  getApproved: (propertyType = null) => {
    const db = getDatabase();
    
    // Проверяем существование новых таблиц
    let useNewTables = false;
    try {
      db.prepare('SELECT 1 FROM properties_apartments LIMIT 1').get();
      db.prepare('SELECT 1 FROM properties_houses LIMIT 1').get();
      useNewTables = true;
    } catch (e) {
      useNewTables = false;
    }
    
    if (useNewTables) {
      let apartmentsQuery = `
        SELECT 
          p.*,
          u.first_name,
          u.last_name,
          u.email,
          u.phone_number,
          u.role,
          'apartments' as source_table
        FROM properties_apartments p
        LEFT JOIN users u ON p.user_id = u.id
        WHERE p.moderation_status = 'approved' 
          AND (p.is_auction = 0 OR p.is_auction IS NULL OR p.is_auction = '0' OR CAST(p.is_auction AS TEXT) = '0')
      `;
      
      let housesQuery = `
        SELECT 
          p.*,
          u.first_name,
          u.last_name,
          u.email,
          u.phone_number,
          u.role,
          'houses' as source_table
        FROM properties_houses p
        LEFT JOIN users u ON p.user_id = u.id
        WHERE p.moderation_status = 'approved' 
          AND (p.is_auction = 0 OR p.is_auction IS NULL OR p.is_auction = '0' OR CAST(p.is_auction AS TEXT) = '0')
      `;
      
      const params = [];
      if (propertyType) {
        apartmentsQuery += ' AND p.property_type = ?';
        housesQuery += ' AND p.property_type = ?';
        params.push(propertyType);
      }
      
      apartmentsQuery += ' ORDER BY p.reviewed_at DESC, p.created_at DESC';
      housesQuery += ' ORDER BY p.reviewed_at DESC, p.created_at DESC';
      
      // Логируем SQL запросы для отладки
      if (propertyType === 'apartment' || propertyType === 'commercial') {
        console.log(`🔍 getApproved SQL для apartments:`, apartmentsQuery);
        console.log(`🔍 getApproved параметры:`, params);
      }
      
      const apartments = db.prepare(apartmentsQuery).all(...params);
      const houses = db.prepare(housesQuery).all(...params);
      
      console.log(`📊 getApproved: найдено apartments=${apartments.length}, houses=${houses.length}, фильтр type=${propertyType || 'null'}`);
      
      // Дополнительное логирование для отладки проблем с публикацией
      if (apartments.length > 0) {
        console.log(`📊 getApproved: примеры apartments:`, apartments.slice(0, 3).map(a => ({
          id: a.id,
          property_type: a.property_type,
          title: a.title?.substring(0, 30),
          moderation_status: a.moderation_status,
          is_auction: a.is_auction,
          is_auction_type: typeof a.is_auction,
          price: a.price
        })));
      } else {
        // Если не найдено apartments, проверяем, есть ли вообще одобренные
        const allApprovedApartments = db.prepare(`
          SELECT id, property_type, title, moderation_status, is_auction, price
          FROM properties_apartments 
          WHERE moderation_status = 'approved'
        `).all();
        console.log(`🔍 getApproved: всего одобренных apartments (без фильтра is_auction): ${allApprovedApartments.length}`);
        if (allApprovedApartments.length > 0) {
          console.log(`🔍 getApproved: примеры всех одобренных apartments:`, allApprovedApartments.slice(0, 5).map(a => ({
            id: a.id,
            property_type: a.property_type,
            title: a.title?.substring(0, 30),
            moderation_status: a.moderation_status,
            is_auction: a.is_auction,
            is_auction_type: typeof a.is_auction,
            price: a.price
          })));
        }
      }
      
      // Логируем запросы для отладки
      if (propertyType === 'house' || propertyType === 'villa') {
        console.log('🔍 SQL запрос для houses:', housesQuery);
        console.log('🔍 Параметры запроса:', params);
      }
      
      if (houses.length > 0) {
        console.log('📊 Пример дома/виллы:', {
          id: houses[0].id,
          property_type: houses[0].property_type,
          title: houses[0].title,
          moderation_status: houses[0].moderation_status,
          is_auction: houses[0].is_auction,
          is_auction_type: typeof houses[0].is_auction
        });
      } else if (propertyType === 'house' || propertyType === 'villa') {
        // Если не найдено, проверяем, есть ли вообще дома/виллы с approved статусом
        const allHouses = db.prepare('SELECT id, property_type, title, moderation_status, is_auction FROM properties_houses WHERE moderation_status = ?').all('approved');
        console.log('🔍 Всего домов/вилл со статусом approved:', allHouses.length);
        if (allHouses.length > 0) {
          console.log('🔍 Примеры домов/вилл:', allHouses.slice(0, 3).map(h => ({
            id: h.id,
            property_type: h.property_type,
            title: h.title,
            moderation_status: h.moderation_status,
            is_auction: h.is_auction,
            is_auction_type: typeof h.is_auction
          })));
        }
      }
      
      // Объединяем и сортируем
      const allProperties = [...apartments, ...houses].sort((a, b) => {
        const dateA = new Date(a.reviewed_at || a.created_at);
        const dateB = new Date(b.reviewed_at || b.created_at);
        return dateB - dateA;
      });
      
      // Парсим JSON поля безопасно
      return allProperties.map(property => {
        if (property.amenities && typeof property.amenities === 'string') {
          try {
            property.amenities = JSON.parse(property.amenities);
          } catch (e) {
            property.amenities = [];
          }
        } else if (!property.amenities) {
          property.amenities = [];
        }
        if (property.coordinates && typeof property.coordinates === 'string') {
          try {
            property.coordinates = JSON.parse(property.coordinates);
          } catch (e) {
            property.coordinates = null;
          }
        }
        if (property.photos && typeof property.photos === 'string') {
          try {
            property.photos = JSON.parse(property.photos);
          } catch (e) {
            property.photos = [];
          }
        } else if (!property.photos) {
          property.photos = [];
        }
        if (property.videos && typeof property.videos === 'string') {
          try {
            property.videos = JSON.parse(property.videos);
          } catch (e) {
            property.videos = [];
          }
        } else if (!property.videos) {
          property.videos = [];
        }
        if (property.additional_documents && typeof property.additional_documents === 'string') {
          try {
            property.additional_documents = JSON.parse(property.additional_documents);
          } catch (e) {
            property.additional_documents = [];
          }
        } else if (!property.additional_documents) {
          property.additional_documents = [];
        }
        if (property.test_drive_data && typeof property.test_drive_data === 'string') {
          try {
            property.test_drive_data = JSON.parse(property.test_drive_data);
          } catch (e) {
            property.test_drive_data = null;
          }
        }
        return property;
      });
    } else {
      // Fallback на старую таблицу
      let query = `
        SELECT p.*, 
               u.first_name, u.last_name, u.email, u.phone_number
        FROM properties p
        LEFT JOIN users u ON p.user_id = u.id
        WHERE p.moderation_status = 'approved' 
          AND (p.is_auction = 0 OR p.is_auction IS NULL)
      `;
      
      const params = [];
      if (propertyType) {
        query += ' AND p.property_type = ?';
        params.push(propertyType);
      }
      
      query += ' ORDER BY p.reviewed_at DESC, p.created_at DESC';
      
      return db.prepare(query).all(...params);
    }
  },

  /**
   * Получить объекты-аукционы
   */
  getAuctions: (propertyType = null) => {
    const db = getDatabase();
    
    // Проверяем существование новых таблиц
    let useNewTables = false;
    try {
      db.prepare('SELECT 1 FROM properties_apartments LIMIT 1').get();
      db.prepare('SELECT 1 FROM properties_houses LIMIT 1').get();
      useNewTables = true;
    } catch (e) {
      useNewTables = false;
    }
    
    if (useNewTables) {
      let apartmentsQuery = `
        SELECT 
          p.*,
          u.first_name,
          u.last_name,
          u.email,
          u.phone_number,
          u.role,
          'apartments' as source_table
        FROM properties_apartments p
        LEFT JOIN users u ON p.user_id = u.id
        WHERE p.moderation_status = 'approved' 
          AND (p.is_auction = 1 OR p.is_auction = '1')
          AND (p.auction_end_date IS NOT NULL AND p.auction_end_date != '' OR p.auction_starting_price IS NOT NULL)
          AND (p.sale_type IS NULL OR p.sale_type != 'debt')
          AND (p.is_debt IS NULL OR p.is_debt = 0)
          AND (p.has_debt IS NULL OR p.has_debt = 0)
      `;
      
      let housesQuery = `
        SELECT 
          p.*,
          u.first_name,
          u.last_name,
          u.email,
          u.phone_number,
          u.role,
          'houses' as source_table
        FROM properties_houses p
        LEFT JOIN users u ON p.user_id = u.id
        WHERE p.moderation_status = 'approved' 
          AND (p.is_auction = 1 OR p.is_auction = '1')
          AND (p.auction_end_date IS NOT NULL AND p.auction_end_date != '' OR p.auction_starting_price IS NOT NULL)
          AND (p.sale_type IS NULL OR p.sale_type != 'debt')
          AND (p.is_debt IS NULL OR p.is_debt = 0)
          AND (p.has_debt IS NULL OR p.has_debt = 0)
      `;
      
      const params = [];
      if (propertyType) {
        apartmentsQuery += ' AND p.property_type = ?';
        housesQuery += ' AND p.property_type = ?';
        params.push(propertyType);
      }
      
      apartmentsQuery += ' ORDER BY p.auction_end_date ASC';
      housesQuery += ' ORDER BY p.auction_end_date ASC';
      
      const apartments = db.prepare(apartmentsQuery).all(...params);
      const houses = db.prepare(housesQuery).all(...params);
      
      console.log(`📊 getAuctions: найдено apartments=${apartments.length}, houses=${houses.length}, фильтр type=${propertyType || 'null'}`);
      
      // Если не найдено, проверяем, есть ли вообще аукционные объекты
      if (houses.length === 0 && (propertyType === 'house' || propertyType === 'villa' || !propertyType)) {
        const allAuctionHouses = db.prepare(`
          SELECT id, property_type, title, moderation_status, is_auction, auction_end_date 
          FROM properties_houses 
          WHERE moderation_status = 'approved' AND (is_auction = 1 OR is_auction = '1')
        `).all();
        console.log(`🔍 Всего аукционных домов/вилл со статусом approved: ${allAuctionHouses.length}`);
        if (allAuctionHouses.length > 0) {
          console.log('🔍 Примеры аукционных домов/вилл:', allAuctionHouses.slice(0, 3).map(h => ({
            id: h.id,
            property_type: h.property_type,
            title: h.title,
            moderation_status: h.moderation_status,
            is_auction: h.is_auction,
            is_auction_type: typeof h.is_auction,
            auction_end_date: h.auction_end_date
          })));
        }
      }
      
      if (houses.length > 0) {
        console.log('📊 Пример аукционного дома/виллы:', {
          id: houses[0].id,
          property_type: houses[0].property_type,
          title: houses[0].title,
          moderation_status: houses[0].moderation_status,
          is_auction: houses[0].is_auction,
          is_auction_type: typeof houses[0].is_auction,
          auction_end_date: houses[0].auction_end_date
        });
      }
      
      // Объединяем и сортируем по дате окончания аукциона
      const allProperties = [...apartments, ...houses].sort((a, b) => {
        return new Date(a.auction_end_date) - new Date(b.auction_end_date);
      });
      
      // Парсим JSON поля безопасно
      return allProperties.map(property => {
        if (property.amenities && typeof property.amenities === 'string') {
          try {
            property.amenities = JSON.parse(property.amenities);
          } catch (e) {
            property.amenities = [];
          }
        } else if (!property.amenities) {
          property.amenities = [];
        }
        if (property.coordinates && typeof property.coordinates === 'string') {
          try {
            property.coordinates = JSON.parse(property.coordinates);
          } catch (e) {
            property.coordinates = null;
          }
        }
        if (property.photos && typeof property.photos === 'string') {
          try {
            property.photos = JSON.parse(property.photos);
          } catch (e) {
            property.photos = [];
          }
        } else if (!property.photos) {
          property.photos = [];
        }
        if (property.videos && typeof property.videos === 'string') {
          try {
            property.videos = JSON.parse(property.videos);
          } catch (e) {
            property.videos = [];
          }
        } else if (!property.videos) {
          property.videos = [];
        }
        if (property.additional_documents && typeof property.additional_documents === 'string') {
          try {
            property.additional_documents = JSON.parse(property.additional_documents);
          } catch (e) {
            property.additional_documents = [];
          }
        } else if (!property.additional_documents) {
          property.additional_documents = [];
        }
        if (property.test_drive_data && typeof property.test_drive_data === 'string') {
          try {
            property.test_drive_data = JSON.parse(property.test_drive_data);
          } catch (e) {
            property.test_drive_data = null;
          }
        }
        return property;
      });
    } else {
      // Fallback на старую таблицу
      let query = `
        SELECT p.*, 
               u.first_name, u.last_name, u.email, u.phone_number
        FROM properties p
        LEFT JOIN users u ON p.user_id = u.id
        WHERE p.moderation_status = 'approved' 
          AND p.is_auction = 1
          AND p.auction_end_date IS NOT NULL
          AND p.auction_end_date != ''
      `;
      
      const params = [];
      if (propertyType) {
        query += ' AND p.property_type = ?';
        params.push(propertyType);
      }
      
      query += ' ORDER BY p.auction_end_date ASC';
      
      return db.prepare(query).all(...params);
    }
  },

  /**
   * Получить объекты на модерации с информацией о пользователе
   */
  getPending: () => {
    const db = getDatabase();
    
    // Проверяем существование новых таблиц (через sqlite_master — надёжнее, чем запрос к данным)
    let useNewTables = false;
    try {
      const hasApartments = db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='properties_apartments'").get();
      const hasHouses = db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='properties_houses'").get();
      useNewTables = !!(hasApartments && hasHouses);
      if (!useNewTables) {
        console.warn('⚠️ getPending: таблицы properties_apartments или properties_houses отсутствуют — объявления на модерации читаются из старой таблицы properties (может быть пусто)');
      }
    } catch (e) {
      useNewTables = false;
      console.warn('⚠️ getPending: ошибка проверки таблиц:', e.message);
    }
    
    if (useNewTables) {
      // Получаем из обеих таблиц
      const apartmentsStmt = db.prepare(`
        SELECT 
          p.*,
          u.first_name,
          u.last_name,
          u.email,
          u.phone_number,
          u.role,
          'apartments' as source_table
        FROM properties_apartments p
        LEFT JOIN users u ON p.user_id = u.id
        WHERE p.moderation_status = 'pending'
          AND (p.property_type = 'apartment' OR p.property_type = 'commercial')
        ORDER BY p.created_at DESC
      `);
      
      const housesStmt = db.prepare(`
        SELECT 
          p.*,
          u.first_name,
          u.last_name,
          u.email,
          u.phone_number,
          u.role,
          'houses' as source_table
        FROM properties_houses p
        LEFT JOIN users u ON p.user_id = u.id
        WHERE p.moderation_status = 'pending'
          AND (p.property_type = 'house' OR p.property_type = 'villa')
        ORDER BY p.created_at DESC
      `);
      
      const apartments = apartmentsStmt.all();
      const houses = housesStmt.all();
      
      console.log(`📊 getPending: найдено apartments=${apartments.length}, houses=${houses.length}`);
      
      // Дополнительное логирование для отладки
      if (apartments.length > 0) {
        console.log(`📊 getPending: примеры apartments:`, apartments.slice(0, 3).map(a => ({
          id: a.id,
          property_type: a.property_type,
          title: a.title?.substring(0, 30),
          moderation_status: a.moderation_status
        })));
      }
      if (houses.length > 0) {
        console.log(`📊 getPending: примеры houses:`, houses.slice(0, 3).map(h => ({
          id: h.id,
          property_type: h.property_type,
          title: h.title?.substring(0, 30),
          moderation_status: h.moderation_status
        })));
      }
      
      // Объединяем и сортируем
      const allProperties = [...apartments, ...houses].sort((a, b) => {
        return new Date(b.created_at) - new Date(a.created_at);
      });
      
      // Проверяем на дубликаты ID
      const ids = new Set();
      const duplicates = [];
      allProperties.forEach(p => {
        if (ids.has(p.id)) {
          duplicates.push(p.id);
        } else {
          ids.add(p.id);
        }
      });
      if (duplicates.length > 0) {
        console.warn(`⚠️ getPending: обнаружены дубликаты ID: ${duplicates.join(', ')}`);
      }
      
      // Парсим JSON поля
      return allProperties.map(property => {
        if (property.amenities) {
          try {
            property.amenities = JSON.parse(property.amenities);
          } catch (e) {
            property.amenities = [];
          }
        }
        if (property.coordinates) {
          try {
            property.coordinates = JSON.parse(property.coordinates);
          } catch (e) {
            property.coordinates = null;
          }
        }
        if (property.photos) {
          try {
            property.photos = JSON.parse(property.photos);
          } catch (e) {
            property.photos = [];
          }
        }
        if (property.videos) {
          try {
            property.videos = JSON.parse(property.videos);
          } catch (e) {
            property.videos = [];
          }
        }
        if (property.additional_documents) {
          try {
            property.additional_documents = JSON.parse(property.additional_documents);
          } catch (e) {
            property.additional_documents = [];
          }
        }
        if (property.test_drive_data) {
          try {
            property.test_drive_data = JSON.parse(property.test_drive_data);
          } catch (e) {
            property.test_drive_data = null;
          }
        }
        return property;
      });
    } else {
      // Fallback на старую таблицу
      const stmt = db.prepare(`
        SELECT 
          p.*,
          u.first_name,
          u.last_name,
          u.email,
          u.phone_number,
          u.role
        FROM properties p
        LEFT JOIN users u ON p.user_id = u.id
        WHERE p.moderation_status = 'pending'
        ORDER BY p.created_at DESC
      `);
      return stmt.all();
    }
  },

  /**
   * Алиас для getPending (для обратной совместимости)
   */
  getPendingProperties: function() {
    return this.getPending();
  }
};

