-- Создание таблицы для выигранных объектов на аукционе
-- Эта таблица хранит информацию о победителях аукционов и депозитах

CREATE TABLE IF NOT EXISTS auction_winners (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Данные пользователя-победителя
    user_id INTEGER NOT NULL,
    
    -- Данные объекта
    property_id INTEGER NOT NULL,
    property_table TEXT NOT NULL, -- 'properties', 'properties_apartments', 'properties_houses'
    
    -- Информация о выигрыше
    winning_bid_amount REAL NOT NULL,
    currency TEXT DEFAULT 'USD',
    auction_end_date TEXT NOT NULL, -- Дата окончания аукциона (когда был выигран)
    won_at TEXT DEFAULT (datetime('now')), -- Когда был зарегистрирован победитель
    
    -- Информация о депозите
    deposit_amount REAL NOT NULL, -- Сумма депозита (обычно 10% от выигрышной ставки)
    deposit_due_date TEXT NOT NULL, -- Дата до которой нужно внести депозит (3 дня с момента выигрыша)
    deposit_paid INTEGER DEFAULT 0, -- 0 = не оплачен, 1 = оплачен
    deposit_paid_at TEXT, -- Дата оплаты депозита
    
    -- Статус покупки
    status TEXT DEFAULT 'pending_deposit', -- pending_deposit, deposit_paid, completed, cancelled
    
    -- Временные метки
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Создаем индексы для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_auction_winners_user_id ON auction_winners(user_id);
CREATE INDEX IF NOT EXISTS idx_auction_winners_property_id ON auction_winners(property_id);
CREATE INDEX IF NOT EXISTS idx_auction_winners_status ON auction_winners(status);
CREATE INDEX IF NOT EXISTS idx_auction_winners_deposit_paid ON auction_winners(deposit_paid);

