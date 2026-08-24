CREATE TABLE IF NOT EXISTS "webauthn_credentials" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL,
  "credential_id" TEXT NOT NULL,
  "public_key" BYTEA NOT NULL,
  "counter" BIGINT NOT NULL DEFAULT 0,
  "transports" TEXT,
  "device_type" TEXT,
  "backed_up" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_used_at" TIMESTAMPTZ,
  CONSTRAINT "webauthn_credentials_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX IF NOT EXISTS "webauthn_credentials_credential_id_key"
  ON "webauthn_credentials"("credential_id");
CREATE INDEX IF NOT EXISTS "idx_webauthn_credentials_user"
  ON "webauthn_credentials"("user_id");

CREATE TABLE IF NOT EXISTS "webauthn_challenges" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL,
  "ceremony" TEXT NOT NULL,
  "challenge" TEXT NOT NULL,
  "origin" TEXT NOT NULL,
  "rp_id" TEXT NOT NULL,
  "expires_at" TIMESTAMPTZ NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "webauthn_challenges_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_webauthn_challenges_user_ceremony"
  ON "webauthn_challenges"("user_id", "ceremony");
CREATE INDEX IF NOT EXISTS "idx_webauthn_challenges_expiry"
  ON "webauthn_challenges"("expires_at");
