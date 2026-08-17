CREATE TABLE "mobile_auth_sessions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mobile_auth_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "mobile_auth_sessions_token_hash_key"
ON "mobile_auth_sessions"("token_hash");

CREATE INDEX "idx_mobile_auth_sessions_user_expiry"
ON "mobile_auth_sessions"("user_id", "expires_at");

ALTER TABLE "mobile_auth_sessions"
ADD CONSTRAINT "mobile_auth_sessions_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE NO ACTION;
