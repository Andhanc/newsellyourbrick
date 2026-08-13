CREATE TABLE "push_notification_tokens" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "device_id" TEXT,
    "enabled" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_notification_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "push_notification_tokens_token_key"
ON "push_notification_tokens"("token");

CREATE INDEX "idx_push_tokens_user_enabled"
ON "push_notification_tokens"("user_id", "enabled");

ALTER TABLE "push_notification_tokens"
ADD CONSTRAINT "push_notification_tokens_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE NO ACTION;
