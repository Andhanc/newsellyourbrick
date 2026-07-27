CREATE TABLE IF NOT EXISTS property_ai_conversations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  property_id INTEGER NOT NULL,
  property_table TEXT NOT NULL DEFAULT 'properties',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, property_id, property_table)
);

CREATE TABLE IF NOT EXISTS property_ai_reports (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES property_ai_conversations(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  question TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'analyzing', 'rendering', 'completed', 'failed')),
  short_answer TEXT,
  report_json JSONB,
  pdf_data BYTEA,
  model TEXT NOT NULL,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS property_ai_messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES property_ai_conversations(id) ON DELETE CASCADE,
  report_id INTEGER REFERENCES property_ai_reports(id) ON DELETE SET NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_ai_conversations_owner
  ON property_ai_conversations(user_id, property_id, property_table);
CREATE INDEX IF NOT EXISTS idx_property_ai_reports_conversation_created
  ON property_ai_reports(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_property_ai_reports_status
  ON property_ai_reports(status, updated_at);
CREATE INDEX IF NOT EXISTS idx_property_ai_messages_conversation_created
  ON property_ai_messages(conversation_id, created_at);
