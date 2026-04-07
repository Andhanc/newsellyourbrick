-- CreateTable
CREATE TABLE "auction_reminders" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "property_id" INTEGER NOT NULL,
    "property_table" TEXT NOT NULL,
    "notify_email" INTEGER DEFAULT 1,
    "notify_whatsapp" INTEGER DEFAULT 0,
    "scheduled_at" TEXT NOT NULL,
    "auction_start_at" TEXT,
    "reminder_sent_at" TEXT,
    "auction_started_sent_at" TEXT,
    "circular_started_notified_at" TEXT,
    "property_title" TEXT,
    "created_at" TEXT DEFAULT 'datetime(''now'')',
    "updated_at" TEXT DEFAULT 'datetime(''now'')',

    CONSTRAINT "auction_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sqlite_autoindex_auction_reminders_1" ON "auction_reminders"("user_id", "property_id", "property_table");

-- CreateIndex
CREATE INDEX "idx_auction_reminders_scheduled" ON "auction_reminders"("reminder_sent_at", "scheduled_at");

-- CreateIndex
CREATE INDEX "idx_auction_reminders_started" ON "auction_reminders"("auction_started_sent_at", "auction_start_at");
