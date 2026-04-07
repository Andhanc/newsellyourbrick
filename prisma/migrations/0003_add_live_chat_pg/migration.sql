-- CreateTable
CREATE TABLE "live_chat_sessions" (
    "id" SERIAL NOT NULL,
    "public_token" TEXT NOT NULL,
    "user_id" INTEGER,
    "assistant_session_id" TEXT,
    "display_label" TEXT,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "live_chat_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_chat_messages" (
    "id" SERIAL NOT NULL,
    "session_id" INTEGER NOT NULL,
    "sender_role" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "live_chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sqlite_autoindex_live_chat_sessions_1" ON "live_chat_sessions"("public_token");

-- CreateIndex
CREATE INDEX "idx_live_chat_sessions_assistant" ON "live_chat_sessions"("assistant_session_id");

-- CreateIndex
CREATE INDEX "idx_live_chat_sessions_updated" ON "live_chat_sessions"("updated_at");

-- CreateIndex
CREATE INDEX "idx_live_chat_messages_session" ON "live_chat_messages"("session_id", "id");

-- AddForeignKey
ALTER TABLE "live_chat_sessions" ADD CONSTRAINT "live_chat_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "live_chat_messages" ADD CONSTRAINT "live_chat_messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "live_chat_sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
