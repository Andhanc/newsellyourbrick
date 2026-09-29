CREATE TABLE development_projects (
 id SERIAL PRIMARY KEY, slug TEXT NOT NULL UNIQUE, owner_id INTEGER NOT NULL REFERENCES users(id),
 title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', location TEXT NOT NULL, asset_type TEXT NOT NULL DEFAULT 'land',
 currency TEXT NOT NULL DEFAULT 'EUR', stage TEXT NOT NULL DEFAULT 'land', published BOOLEAN NOT NULL DEFAULT false,
 is_demo BOOLEAN NOT NULL DEFAULT false, photos JSONB NOT NULL DEFAULT '[]', documents JSONB NOT NULL DEFAULT '[]', terms JSONB NOT NULL, history JSONB NOT NULL DEFAULT '[]',
 source_table TEXT, source_id INTEGER, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 CHECK (stage IN ('land','fundraising','construction','sale','returned'))
);
CREATE INDEX development_projects_owner_id_idx ON development_projects(owner_id);
CREATE TABLE development_interests (
 id SERIAL PRIMARY KEY, project_id INTEGER NOT NULL REFERENCES development_projects(id), user_id INTEGER NOT NULL REFERENCES users(id),
 amount DECIMAL(18,2) NOT NULL CHECK(amount > 0), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(project_id,user_id)
);
CREATE TABLE development_funding (
 id SERIAL PRIMARY KEY, project_id INTEGER NOT NULL REFERENCES development_projects(id), amount DECIMAL(18,2) NOT NULL CHECK(amount > 0),
 reference TEXT NOT NULL, recorded_by INTEGER NOT NULL REFERENCES users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(project_id,reference)
);
CREATE TABLE buyer_passports (
 user_id INTEGER PRIMARY KEY REFERENCES users(id), investor_type TEXT NOT NULL DEFAULT 'individual', declared_capital DECIMAL(18,2) NOT NULL DEFAULT 0,
 average_ticket DECIMAL(18,2) NOT NULL DEFAULT 0, past_deals INTEGER NOT NULL DEFAULT 0, payment_method TEXT NOT NULL DEFAULT 'bank',
 readiness TEXT NOT NULL DEFAULT 'exploring', share_with_sellers BOOLEAN NOT NULL DEFAULT false, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE asset_deal_profiles (
 id SERIAL PRIMARY KEY, property_table TEXT NOT NULL, property_id INTEGER NOT NULL, owner_id INTEGER NOT NULL REFERENCES users(id),
 seller_goal TEXT NOT NULL DEFAULT 'maximum', current_model TEXT NOT NULL DEFAULT 'auction', decision JSONB NOT NULL DEFAULT '{}',
 exits JSONB NOT NULL DEFAULT '{}', history JSONB NOT NULL DEFAULT '[]', updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(property_table,property_id)
);
CREATE TABLE deal_events (
 id SERIAL PRIMARY KEY, asset_key TEXT NOT NULL, user_id INTEGER REFERENCES users(id), visitor_id TEXT NOT NULL,
 kind TEXT NOT NULL, amount DECIMAL(18,2), country TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX deal_events_asset_key_created_at_idx ON deal_events(asset_key,created_at);
