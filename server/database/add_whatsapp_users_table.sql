-- Создание таблицы для WhatsApp пользователей
CREATE TABLE IF NOT EXISTS whatsapp_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone_number TEXT UNIQUE NOT NULL, -- Номер телефона в формате WhatsApp (например, 79991234567@c.us)
    phone_number_clean TEXT, -- Чистый номер без @c.us
    first_name TEXT,
    last_name TEXT,
    country TEXT, -- Код страны (RU, ES, US и т.д.)
    language TEXT DEFAULT 'ru', -- Язык пользователя (ru, en, es и т.д.)
    last_message_at DATETIME, -- Время последнего сообщения
    message_count INTEGER DEFAULT 0, -- Количество отправленных сообщений
    lead_type TEXT DEFAULT 'cold', -- hot | warm | cold (оценка по переписке)
    is_active INTEGER DEFAULT 1, -- 1 для активных, 0 для неактивных
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Создание индексов для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_whatsapp_users_phone ON whatsapp_users(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_users_phone_clean ON whatsapp_users(phone_number_clean);
CREATE INDEX IF NOT EXISTS idx_whatsapp_users_country ON whatsapp_users(country);
CREATE INDEX IF NOT EXISTS idx_whatsapp_users_is_active ON whatsapp_users(is_active);
CREATE INDEX IF NOT EXISTS idx_whatsapp_users_last_message_at ON whatsapp_users(last_message_at);


