-- Миграция: создание отдельных таблиц для квартир/апартаментов и домов/вилл
-- Дата создания: 2026-02-11

-- ============================================
-- Таблица для квартир и апартаментов
-- ============================================
CREATE TABLE IF NOT EXISTS properties_apartments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    property_type TEXT NOT NULL CHECK(property_type IN ('apartment', 'commercial')), -- 'apartment' или 'commercial'
    title TEXT NOT NULL,
    description TEXT,
    price REAL,
    currency TEXT DEFAULT 'USD',
    is_auction INTEGER DEFAULT 0,
    auction_start_date TEXT,
    auction_end_date TEXT,
    auction_starting_price REAL,
    
    -- Общие характеристики для квартир
    area REAL, -- Общая площадь
    living_area REAL, -- Жилая площадь
    building_type TEXT, -- Тип здания
    rooms INTEGER, -- Количество комнат
    bathrooms INTEGER, -- Количество санузлов
    floor INTEGER, -- Этаж
    total_floors INTEGER, -- Всего этажей в здании
    year_built INTEGER, -- Год постройки
    
    -- Местоположение
    location TEXT, -- Полный адрес
    address TEXT, -- Краткий адрес (улица, дом)
    apartment TEXT, -- Номер квартиры
    country TEXT, -- Страна
    city TEXT, -- Город
    coordinates TEXT, -- JSON координаты [lat, lng]
    
    -- Удобства для квартир/апартаментов (JSON массив)
    amenities TEXT, -- JSON массив удобств
    -- Примеры: ["balcony", "parking", "elevator", "electricity", "internet", "security", "furniture"]
    
    -- Дополнительные характеристики
    renovation TEXT, -- Ремонт
    condition TEXT, -- Состояние
    heating TEXT, -- Отопление
    water_supply TEXT, -- Водоснабжение
    sewerage TEXT, -- Канализация
    
    -- Для коммерческой недвижимости
    commercial_type TEXT, -- Тип коммерческой недвижимости
    business_hours TEXT, -- Часы работы
    
    -- Дополнительные удобства (текстовое описание)
    additional_amenities TEXT,
    
    -- Медиа
    photos TEXT, -- JSON массив URL фото
    videos TEXT, -- JSON массив объектов видео
    additional_documents TEXT, -- JSON массив дополнительных документов
    
    -- Документы для публикации
    ownership_document TEXT, -- Путь к документу о праве собственности
    no_debts_document TEXT, -- Путь к справке об отсутствии долгов
    
    -- Тест-драйв данные
    test_drive INTEGER DEFAULT 0,
    test_drive_data TEXT, -- JSON данные тест-драйва
    
    -- Статус модерации и тип сделки
    moderation_status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    reviewed_by TEXT,
    reviewed_at DATETIME,
    rejection_reason TEXT,
    sale_type TEXT, -- Тип сделки: 'auction', 'share', 'debt' и т.п.
    is_debt INTEGER DEFAULT 0, -- Флаг объекта с долгами
    has_debt INTEGER DEFAULT 0, -- Альтернативный флаг наличия долга
    
    -- Бронирование
    reserved_until TEXT,
    reserved_by TEXT,
    purchase_request_id INTEGER,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Индексы для таблицы квартир/апартаментов
CREATE INDEX IF NOT EXISTS idx_apartments_user_id ON properties_apartments(user_id);
CREATE INDEX IF NOT EXISTS idx_apartments_moderation_status ON properties_apartments(moderation_status);
CREATE INDEX IF NOT EXISTS idx_apartments_property_type ON properties_apartments(property_type);
CREATE INDEX IF NOT EXISTS idx_apartments_user_status ON properties_apartments(user_id, moderation_status);
CREATE INDEX IF NOT EXISTS idx_apartments_city ON properties_apartments(city);
CREATE INDEX IF NOT EXISTS idx_apartments_country ON properties_apartments(country);

-- ============================================
-- Таблица для домов и вилл
-- ============================================
CREATE TABLE IF NOT EXISTS properties_houses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    property_type TEXT NOT NULL CHECK(property_type IN ('house', 'villa')), -- 'house' или 'villa'
    title TEXT NOT NULL,
    description TEXT,
    price REAL,
    currency TEXT DEFAULT 'USD',
    is_auction INTEGER DEFAULT 0,
    auction_start_date TEXT,
    auction_end_date TEXT,
    auction_starting_price REAL,
    
    -- Общие характеристики для домов/вилл
    area REAL, -- Общая площадь дома
    living_area REAL, -- Жилая площадь
    land_area REAL, -- Площадь участка
    building_type TEXT, -- Тип постройки
    bedrooms INTEGER, -- Количество спален
    bathrooms INTEGER, -- Количество санузлов
    floors INTEGER, -- Количество этажей
    year_built INTEGER, -- Год постройки
    
    -- Местоположение
    location TEXT, -- Полный адрес
    address TEXT, -- Краткий адрес (улица, дом)
    country TEXT, -- Страна
    city TEXT, -- Город
    coordinates TEXT, -- JSON координаты [lat, lng]
    
    -- Удобства для домов/вилл (JSON массив)
    amenities TEXT, -- JSON массив удобств
    -- Примеры: ["pool", "garden", "garage", "electricity", "internet", "security", "furniture", "parking"]
    
    -- Дополнительные характеристики
    renovation TEXT, -- Ремонт
    condition TEXT, -- Состояние
    heating TEXT, -- Отопление
    water_supply TEXT, -- Водоснабжение
    sewerage TEXT, -- Канализация
    
    -- Дополнительные удобства (текстовое описание)
    additional_amenities TEXT,
    
    -- Медиа
    photos TEXT, -- JSON массив URL фото
    videos TEXT, -- JSON массив объектов видео
    additional_documents TEXT, -- JSON массив дополнительных документов
    
    -- Документы для публикации
    ownership_document TEXT, -- Путь к документу о праве собственности
    no_debts_document TEXT, -- Путь к справке об отсутствии долгов
    
    -- Тест-драйв данные
    test_drive INTEGER DEFAULT 0,
    test_drive_data TEXT, -- JSON данные тест-драйва
    
    -- Статус модерации и тип сделки
    moderation_status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    reviewed_by TEXT,
    reviewed_at DATETIME,
    rejection_reason TEXT,
    sale_type TEXT, -- Тип сделки: 'auction', 'share', 'debt' и т.п.
    is_debt INTEGER DEFAULT 0, -- Флаг объекта с долгами
    has_debt INTEGER DEFAULT 0, -- Альтернативный флаг наличия долга
    
    -- Бронирование
    reserved_until TEXT,
    reserved_by TEXT,
    purchase_request_id INTEGER,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Индексы для таблицы домов/вилл
CREATE INDEX IF NOT EXISTS idx_houses_user_id ON properties_houses(user_id);
CREATE INDEX IF NOT EXISTS idx_houses_moderation_status ON properties_houses(moderation_status);
CREATE INDEX IF NOT EXISTS idx_houses_property_type ON properties_houses(property_type);
CREATE INDEX IF NOT EXISTS idx_houses_user_status ON properties_houses(user_id, moderation_status);
CREATE INDEX IF NOT EXISTS idx_houses_city ON properties_houses(city);
CREATE INDEX IF NOT EXISTS idx_houses_country ON properties_houses(country);
