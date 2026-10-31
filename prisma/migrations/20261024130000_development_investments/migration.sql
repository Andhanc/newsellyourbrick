CREATE TABLE development_investments (
 id TEXT PRIMARY KEY,
 project_id INTEGER NOT NULL REFERENCES development_projects(id),
 user_id INTEGER NOT NULL REFERENCES users(id),
 amount DECIMAL(18,2) NOT NULL CHECK (amount > 0),
 currency TEXT NOT NULL,
 wallet_eur DECIMAL(18,2) NOT NULL DEFAULT 0 CHECK (wallet_eur >= 0),
 card_amount DECIMAL(18,2) NOT NULL CHECK (card_amount >= 0),
 status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
 session_id TEXT UNIQUE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 expires_at TIMESTAMPTZ NOT NULL,
 paid_at TIMESTAMPTZ
);
CREATE INDEX development_investments_project_id_status_idx ON development_investments(project_id,status);
CREATE INDEX development_investments_user_id_idx ON development_investments(user_id);
