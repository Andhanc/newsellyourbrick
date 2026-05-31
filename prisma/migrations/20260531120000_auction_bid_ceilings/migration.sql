-- CreateTable
CREATE TABLE "auction_bid_ceilings" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "property_id" INTEGER NOT NULL,
    "property_table" TEXT NOT NULL,
    "max_amount" DOUBLE PRECISION NOT NULL,
    "is_active" INTEGER DEFAULT 1,
    "activated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auction_bid_ceilings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sqlite_autoindex_auction_bid_ceilings_1" ON "auction_bid_ceilings"("user_id", "property_id", "property_table");

-- CreateIndex
CREATE INDEX "idx_auction_bid_ceilings_property" ON "auction_bid_ceilings"("property_id", "property_table");

-- CreateIndex
CREATE INDEX "idx_auction_bid_ceilings_user" ON "auction_bid_ceilings"("user_id");

-- AddForeignKey
ALTER TABLE "auction_bid_ceilings" ADD CONSTRAINT "auction_bid_ceilings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
