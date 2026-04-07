-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "administrators" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "email" TEXT,
    "full_name" TEXT,
    "is_super_admin" INTEGER DEFAULT 0,
    "can_access_statistics" INTEGER DEFAULT 0,
    "can_access_users" INTEGER DEFAULT 0,
    "can_access_moderation" INTEGER DEFAULT 0,
    "can_access_chat" INTEGER DEFAULT 0,
    "can_access_objects" INTEGER DEFAULT 0,
    "can_access_access_management" INTEGER DEFAULT 0,
    "created_by" INTEGER,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "administrators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assistant_leads" (
    "id" SERIAL NOT NULL,
    "session_id" TEXT NOT NULL,
    "user_id" INTEGER,
    "messages" TEXT,
    "preferences" TEXT,
    "summary" TEXT,
    "lead_type" TEXT DEFAULT 'cold',
    "email" TEXT,
    "phone" TEXT,
    "country" TEXT,
    "region" TEXT,
    "property_type" TEXT,
    "created_at" TEXT DEFAULT 'datetime(''now'')',
    "updated_at" TEXT DEFAULT 'datetime(''now'')',
    "manager_contact_requested" INTEGER DEFAULT 0,
    "preferred_contact" TEXT,

    CONSTRAINT "assistant_leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auction_winners" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "property_id" INTEGER NOT NULL,
    "property_table" TEXT NOT NULL,
    "winning_bid_amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT DEFAULT 'USD',
    "auction_end_date" TEXT NOT NULL,
    "won_at" TEXT DEFAULT 'datetime(''now'')',
    "deposit_amount" DOUBLE PRECISION NOT NULL,
    "deposit_due_date" TEXT NOT NULL,
    "deposit_paid" INTEGER DEFAULT 0,
    "deposit_paid_at" TEXT,
    "status" TEXT DEFAULT 'pending_deposit',
    "created_at" TEXT DEFAULT 'datetime(''now'')',
    "updated_at" TEXT DEFAULT 'datetime(''now'')',

    CONSTRAINT "auction_winners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bids" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "property_id" INTEGER NOT NULL,
    "property_table" TEXT,
    "bid_amount" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bids_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bonus_task_submissions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "task_id" INTEGER NOT NULL,
    "link" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "promo_code" TEXT,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),
    "used_at" TIMESTAMP(3),

    CONSTRAINT "bonus_task_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_activities" (
    "id" SERIAL NOT NULL,
    "lead_id" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT,
    "body" TEXT,
    "meta" TEXT,
    "created_by" TEXT,
    "created_at" TEXT DEFAULT 'datetime(''now'')',

    CONSTRAINT "crm_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_leads" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "display_name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "stage_id" INTEGER NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "temperature" TEXT DEFAULT 'warm',
    "interests" TEXT,
    "deal_value" DOUBLE PRECISION,
    "currency" TEXT DEFAULT 'EUR',
    "next_action" TEXT,
    "next_action_at" TEXT,
    "internal_notes" TEXT,
    "source" TEXT,
    "assistant_lead_id" INTEGER,
    "created_at" TEXT DEFAULT 'datetime(''now'')',
    "updated_at" TEXT DEFAULT 'datetime(''now'')',

    CONSTRAINT "crm_leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_stages" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "crm_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "debt_reasons" (
    "id" SERIAL NOT NULL,
    "title_ru" TEXT NOT NULL,
    "code" TEXT,
    "sort_order" INTEGER DEFAULT 0,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "debt_reasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "document_type" TEXT,
    "document_photo" TEXT NOT NULL,
    "is_reviewed" INTEGER DEFAULT 0,
    "verification_status" TEXT DEFAULT 'pending',
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT,
    "data" TEXT,
    "is_read" INTEGER DEFAULT 0,
    "view_count" INTEGER DEFAULT 0,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "properties" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "property_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION,
    "currency" TEXT DEFAULT 'USD',
    "is_auction" INTEGER DEFAULT 0,
    "auction_start_date" TEXT,
    "auction_end_date" TEXT,
    "auction_starting_price" DOUBLE PRECISION,
    "area" DOUBLE PRECISION,
    "rooms" INTEGER,
    "bedrooms" INTEGER,
    "bathrooms" INTEGER,
    "floor" INTEGER,
    "total_floors" INTEGER,
    "year_built" INTEGER,
    "location" TEXT,
    "balcony" INTEGER DEFAULT 0,
    "parking" INTEGER DEFAULT 0,
    "elevator" INTEGER DEFAULT 0,
    "land_area" DOUBLE PRECISION,
    "garage" INTEGER DEFAULT 0,
    "pool" INTEGER DEFAULT 0,
    "garden" INTEGER DEFAULT 0,
    "commercial_type" TEXT,
    "business_hours" TEXT,
    "renovation" TEXT,
    "condition" TEXT,
    "heating" TEXT,
    "water_supply" TEXT,
    "sewerage" TEXT,
    "electricity" INTEGER DEFAULT 0,
    "internet" INTEGER DEFAULT 0,
    "security" INTEGER DEFAULT 0,
    "furniture" INTEGER DEFAULT 0,
    "photos" TEXT,
    "videos" TEXT,
    "additional_documents" TEXT,
    "ownership_document" TEXT,
    "no_debts_document" TEXT,
    "test_drive" INTEGER DEFAULT 0,
    "test_drive_data" TEXT,
    "moderation_status" TEXT DEFAULT 'pending',
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "living_area" DOUBLE PRECISION,
    "building_type" TEXT,
    "additional_amenities" TEXT,
    "test_timer_end_date" TEXT,
    "auction_minimum_bid" DOUBLE PRECISION,

    CONSTRAINT "properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "properties_apartments" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "property_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION,
    "currency" TEXT DEFAULT 'USD',
    "is_auction" INTEGER DEFAULT 0,
    "auction_start_date" TEXT,
    "auction_end_date" TEXT,
    "auction_starting_price" DOUBLE PRECISION,
    "area" DOUBLE PRECISION,
    "living_area" DOUBLE PRECISION,
    "building_type" TEXT,
    "rooms" INTEGER,
    "bathrooms" INTEGER,
    "floor" INTEGER,
    "total_floors" INTEGER,
    "year_built" INTEGER,
    "location" TEXT,
    "address" TEXT,
    "apartment" TEXT,
    "country" TEXT,
    "city" TEXT,
    "coordinates" TEXT,
    "amenities" TEXT,
    "renovation" TEXT,
    "condition" TEXT,
    "heating" TEXT,
    "water_supply" TEXT,
    "sewerage" TEXT,
    "balcony" INTEGER DEFAULT 0,
    "parking" INTEGER DEFAULT 0,
    "elevator" INTEGER DEFAULT 0,
    "electricity" INTEGER DEFAULT 0,
    "internet" INTEGER DEFAULT 0,
    "security" INTEGER DEFAULT 0,
    "furniture" INTEGER DEFAULT 0,
    "commercial_type" TEXT,
    "business_hours" TEXT,
    "additional_amenities" TEXT,
    "photos" TEXT,
    "videos" TEXT,
    "additional_documents" TEXT,
    "ownership_document" TEXT,
    "no_debts_document" TEXT,
    "test_drive" INTEGER DEFAULT 0,
    "test_drive_data" TEXT,
    "moderation_status" TEXT DEFAULT 'pending',
    "reviewed_by" TEXT,
    "reviewed_at" TEXT,
    "rejection_reason" TEXT,
    "is_shared_ownership" INTEGER DEFAULT 0,
    "total_shares" INTEGER,
    "shares_sold" INTEGER DEFAULT 0,
    "reserved_until" TEXT,
    "reserved_by" INTEGER,
    "purchase_request_id" INTEGER,
    "created_at" TEXT DEFAULT 'datetime(''now'')',
    "updated_at" TEXT DEFAULT 'datetime(''now'')',
    "sale_type" TEXT,
    "is_debt" INTEGER DEFAULT 0,
    "has_debt" INTEGER DEFAULT 0,
    "debt_utilities" INTEGER DEFAULT 0,
    "debt_mortgage_pledge" INTEGER DEFAULT 0,
    "debt_property_taxes" INTEGER DEFAULT 0,
    "debt_arrest" INTEGER DEFAULT 0,
    "debt_inherited" INTEGER DEFAULT 0,
    "debt_third_party" INTEGER DEFAULT 0,
    "debt_other" TEXT,
    "debt_amount" DOUBLE PRECISION,
    "debt_severity" TEXT,
    "test_timer_end_date" TEXT,
    "test_timer_duration" INTEGER,

    CONSTRAINT "properties_apartments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "properties_houses" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "property_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION,
    "currency" TEXT DEFAULT 'USD',
    "is_auction" INTEGER DEFAULT 0,
    "auction_start_date" TEXT,
    "auction_end_date" TEXT,
    "auction_starting_price" DOUBLE PRECISION,
    "area" DOUBLE PRECISION,
    "living_area" DOUBLE PRECISION,
    "land_area" DOUBLE PRECISION,
    "building_type" TEXT,
    "bedrooms" INTEGER,
    "bathrooms" INTEGER,
    "floors" INTEGER,
    "year_built" INTEGER,
    "location" TEXT,
    "address" TEXT,
    "country" TEXT,
    "city" TEXT,
    "coordinates" TEXT,
    "amenities" TEXT,
    "renovation" TEXT,
    "condition" TEXT,
    "heating" TEXT,
    "water_supply" TEXT,
    "sewerage" TEXT,
    "pool" INTEGER DEFAULT 0,
    "garden" INTEGER DEFAULT 0,
    "garage" INTEGER DEFAULT 0,
    "parking" INTEGER DEFAULT 0,
    "electricity" INTEGER DEFAULT 0,
    "internet" INTEGER DEFAULT 0,
    "security" INTEGER DEFAULT 0,
    "furniture" INTEGER DEFAULT 0,
    "additional_amenities" TEXT,
    "photos" TEXT,
    "videos" TEXT,
    "additional_documents" TEXT,
    "ownership_document" TEXT,
    "no_debts_document" TEXT,
    "test_drive" INTEGER DEFAULT 0,
    "test_drive_data" TEXT,
    "moderation_status" TEXT DEFAULT 'pending',
    "reviewed_by" TEXT,
    "reviewed_at" TEXT,
    "rejection_reason" TEXT,
    "is_shared_ownership" INTEGER DEFAULT 0,
    "total_shares" INTEGER,
    "shares_sold" INTEGER DEFAULT 0,
    "sale_type" TEXT,
    "is_debt" INTEGER DEFAULT 0,
    "has_debt" INTEGER DEFAULT 0,
    "debt_utilities" INTEGER DEFAULT 0,
    "debt_mortgage_pledge" INTEGER DEFAULT 0,
    "debt_property_taxes" INTEGER DEFAULT 0,
    "debt_arrest" INTEGER DEFAULT 0,
    "debt_inherited" INTEGER DEFAULT 0,
    "debt_third_party" INTEGER DEFAULT 0,
    "debt_other" TEXT,
    "debt_amount" DOUBLE PRECISION,
    "reserved_until" TEXT,
    "reserved_by" INTEGER,
    "purchase_request_id" INTEGER,
    "created_at" TEXT DEFAULT 'datetime(''now'')',
    "updated_at" TEXT DEFAULT 'datetime(''now'')',
    "debt_severity" TEXT,

    CONSTRAINT "properties_houses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_debt_documents" (
    "id" SERIAL NOT NULL,
    "property_id" INTEGER NOT NULL,
    "property_type" TEXT NOT NULL,
    "document_type" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "original_name" TEXT,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "property_debt_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_favorites" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "property_id" INTEGER NOT NULL,
    "property_table" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "property_favorites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_shares" (
    "id" SERIAL NOT NULL,
    "property_id" INTEGER NOT NULL,
    "property_type" TEXT NOT NULL,
    "buyer_id" INTEGER NOT NULL,
    "shares_count" INTEGER NOT NULL,
    "price_per_share" DOUBLE PRECISION NOT NULL,
    "total_price" DOUBLE PRECISION NOT NULL,
    "currency" TEXT DEFAULT 'USD',
    "purchase_date" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT DEFAULT 'completed',

    CONSTRAINT "property_shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_translations" (
    "id" SERIAL NOT NULL,
    "property_id" INTEGER NOT NULL,
    "property_table" TEXT NOT NULL,
    "lang_code" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "additional_amenities" TEXT,
    "created_at" TEXT DEFAULT 'datetime(''now'')',

    CONSTRAINT "property_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_requests" (
    "id" SERIAL NOT NULL,
    "buyer_id" TEXT,
    "buyer_name" TEXT NOT NULL,
    "buyer_email" TEXT,
    "buyer_phone" TEXT,
    "seller_id" TEXT,
    "seller_name" TEXT,
    "seller_email" TEXT,
    "seller_phone" TEXT,
    "property_id" INTEGER,
    "property_title" TEXT NOT NULL,
    "property_description" TEXT,
    "property_price" DOUBLE PRECISION,
    "property_currency" TEXT DEFAULT 'USD',
    "property_location" TEXT,
    "property_type" TEXT,
    "property_area" TEXT,
    "property_rooms" INTEGER,
    "property_bedrooms" INTEGER,
    "property_bathrooms" INTEGER,
    "property_floor" INTEGER,
    "property_total_floors" INTEGER,
    "property_year_built" INTEGER,
    "property_living_area" TEXT,
    "property_land_area" TEXT,
    "property_building_type" TEXT,
    "property_renovation" TEXT,
    "property_condition" TEXT,
    "property_heating" TEXT,
    "property_water_supply" TEXT,
    "property_sewerage" TEXT,
    "property_balcony" INTEGER DEFAULT 0,
    "property_parking" INTEGER DEFAULT 0,
    "property_elevator" INTEGER DEFAULT 0,
    "property_garage" INTEGER DEFAULT 0,
    "property_pool" INTEGER DEFAULT 0,
    "property_garden" INTEGER DEFAULT 0,
    "property_electricity" INTEGER DEFAULT 0,
    "property_internet" INTEGER DEFAULT 0,
    "property_security" INTEGER DEFAULT 0,
    "property_furniture" INTEGER DEFAULT 0,
    "property_commercial_type" TEXT,
    "property_business_hours" TEXT,
    "request_date" TEXT NOT NULL,
    "status" TEXT DEFAULT 'pending',
    "admin_notes" TEXT,
    "created_at" TEXT DEFAULT 'datetime(''now'')',
    "updated_at" TEXT DEFAULT 'datetime(''now'')',
    "property_table" TEXT,

    CONSTRAINT "purchase_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stripe_payments" (
    "id" SERIAL NOT NULL,
    "dedupe_key" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "stripe_customer_id" TEXT,
    "stripe_subscription_id" TEXT,
    "stripe_invoice_id" TEXT,
    "stripe_checkout_session_id" TEXT,
    "amount_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'eur',
    "status" TEXT NOT NULL DEFAULT 'paid',
    "plan_key" TEXT NOT NULL DEFAULT 'pro',
    "billing_reason" TEXT,
    "paid_at" TEXT NOT NULL,
    "period_start" TEXT,
    "period_end" TEXT,
    "customer_email" TEXT,
    "created_at" TEXT DEFAULT 'datetime(''now'')',

    CONSTRAINT "stripe_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stripe_subscription_state" (
    "user_id" SERIAL NOT NULL,
    "stripe_customer_id" TEXT,
    "stripe_subscription_id" TEXT,
    "plan_key" TEXT NOT NULL DEFAULT 'pro',
    "status" TEXT NOT NULL,
    "current_period_start" TEXT,
    "current_period_end" TEXT,
    "cancel_at_period_end" INTEGER DEFAULT 0,
    "updated_at" TEXT DEFAULT 'datetime(''now'')',

    CONSTRAINT "stripe_subscription_state_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "stripe_wallet_deposit_credits" (
    "dedupe_key" TEXT,
    "user_id" INTEGER NOT NULL,
    "amount_eur" DOUBLE PRECISION NOT NULL,
    "stripe_invoice_id" TEXT,
    "stripe_checkout_session_id" TEXT,
    "created_at" TEXT DEFAULT 'datetime(''now'')',

    CONSTRAINT "stripe_wallet_deposit_credits_pkey" PRIMARY KEY ("dedupe_key")
);

-- CreateTable
CREATE TABLE "test_drive_bookings" (
    "id" SERIAL NOT NULL,
    "property_id" INTEGER NOT NULL,
    "property_table" TEXT NOT NULL DEFAULT 'properties_apartments',
    "user_id" INTEGER NOT NULL,
    "start_date" TEXT NOT NULL,
    "end_date" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "owner_notification_id" INTEGER,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "test_drive_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT,
    "email" TEXT,
    "password" TEXT,
    "phone_number" TEXT,
    "passport_series" TEXT,
    "passport_number" TEXT,
    "identification_number" TEXT,
    "address" TEXT,
    "country" TEXT,
    "passport_photo" TEXT,
    "user_photo" TEXT,
    "is_verified" INTEGER DEFAULT 0,
    "role" TEXT DEFAULT 'buyer',
    "is_online" INTEGER DEFAULT 0,
    "is_blocked" INTEGER DEFAULT 0,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "has_card" INTEGER DEFAULT 0,
    "deposit_amount" DOUBLE PRECISION DEFAULT 0,
    "card_number" TEXT,
    "card_type" TEXT,
    "card_cvv" TEXT,
    "user_id_number" TEXT,
    "telegram_id" TEXT,
    "telegram_username" TEXT,
    "telegram_photo_url" TEXT,
    "username" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_users" (
    "id" SERIAL NOT NULL,
    "phone_number" TEXT NOT NULL,
    "phone_number_clean" TEXT,
    "first_name" TEXT,
    "last_name" TEXT,
    "country" TEXT,
    "language" TEXT DEFAULT 'ru',
    "last_message_at" TIMESTAMP(3),
    "message_count" INTEGER DEFAULT 0,
    "is_active" INTEGER DEFAULT 1,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "lead_type" TEXT DEFAULT 'cold',

    CONSTRAINT "whatsapp_users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sqlite_autoindex_administrators_1" ON "administrators"("username");

-- CreateIndex
CREATE INDEX "idx_administrators_email" ON "administrators"("email");

-- CreateIndex
CREATE INDEX "idx_administrators_is_super_admin" ON "administrators"("is_super_admin");

-- CreateIndex
CREATE INDEX "idx_administrators_username" ON "administrators"("username");

-- CreateIndex
CREATE UNIQUE INDEX "sqlite_autoindex_assistant_leads_1" ON "assistant_leads"("session_id");

-- CreateIndex
CREATE INDEX "idx_assistant_leads_updated_at" ON "assistant_leads"("updated_at");

-- CreateIndex
CREATE INDEX "idx_assistant_leads_lead_type" ON "assistant_leads"("lead_type");

-- CreateIndex
CREATE INDEX "idx_assistant_leads_session_id" ON "assistant_leads"("session_id");

-- CreateIndex
CREATE INDEX "idx_auction_winners_deposit_paid" ON "auction_winners"("deposit_paid");

-- CreateIndex
CREATE INDEX "idx_auction_winners_status" ON "auction_winners"("status");

-- CreateIndex
CREATE INDEX "idx_auction_winners_property_id" ON "auction_winners"("property_id");

-- CreateIndex
CREATE INDEX "idx_auction_winners_user_id" ON "auction_winners"("user_id");

-- CreateIndex
CREATE INDEX "idx_bids_property_id_table" ON "bids"("property_id", "property_table");

-- CreateIndex
CREATE INDEX "idx_bids_user_property" ON "bids"("user_id", "property_id");

-- CreateIndex
CREATE INDEX "idx_bids_created_at" ON "bids"("created_at");

-- CreateIndex
CREATE INDEX "idx_bids_property_id" ON "bids"("property_id");

-- CreateIndex
CREATE INDEX "idx_bids_user_id" ON "bids"("user_id");

-- CreateIndex
CREATE INDEX "idx_bonus_submissions_task_id" ON "bonus_task_submissions"("task_id");

-- CreateIndex
CREATE INDEX "idx_bonus_submissions_status" ON "bonus_task_submissions"("status");

-- CreateIndex
CREATE INDEX "idx_bonus_submissions_user_id" ON "bonus_task_submissions"("user_id");

-- CreateIndex
CREATE INDEX "idx_crm_activities_lead" ON "crm_activities"("lead_id");

-- CreateIndex
CREATE INDEX "idx_crm_leads_user" ON "crm_leads"("user_id");

-- CreateIndex
CREATE INDEX "idx_crm_leads_stage" ON "crm_leads"("stage_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "sqlite_autoindex_crm_stages_1" ON "crm_stages"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "sqlite_autoindex_debt_reasons_1" ON "debt_reasons"("code");

-- CreateIndex
CREATE INDEX "idx_debt_reasons_sort" ON "debt_reasons"("sort_order");

-- CreateIndex
CREATE INDEX "idx_documents_user_status" ON "documents"("user_id", "verification_status");

-- CreateIndex
CREATE INDEX "idx_documents_verification_status" ON "documents"("verification_status");

-- CreateIndex
CREATE INDEX "idx_documents_user_id" ON "documents"("user_id");

-- CreateIndex
CREATE INDEX "idx_notifications_user_read" ON "notifications"("user_id", "is_read");

-- CreateIndex
CREATE INDEX "idx_notifications_created_at" ON "notifications"("created_at");

-- CreateIndex
CREATE INDEX "idx_notifications_is_read" ON "notifications"("is_read");

-- CreateIndex
CREATE INDEX "idx_notifications_user_id" ON "notifications"("user_id");

-- CreateIndex
CREATE INDEX "idx_properties_user_status" ON "properties"("user_id", "moderation_status");

-- CreateIndex
CREATE INDEX "idx_properties_property_type" ON "properties"("property_type");

-- CreateIndex
CREATE INDEX "idx_properties_moderation_status" ON "properties"("moderation_status");

-- CreateIndex
CREATE INDEX "idx_properties_user_id" ON "properties"("user_id");

-- CreateIndex
CREATE INDEX "idx_apartments_country" ON "properties_apartments"("country");

-- CreateIndex
CREATE INDEX "idx_apartments_city" ON "properties_apartments"("city");

-- CreateIndex
CREATE INDEX "idx_apartments_user_status" ON "properties_apartments"("user_id", "moderation_status");

-- CreateIndex
CREATE INDEX "idx_apartments_property_type" ON "properties_apartments"("property_type");

-- CreateIndex
CREATE INDEX "idx_apartments_moderation_status" ON "properties_apartments"("moderation_status");

-- CreateIndex
CREATE INDEX "idx_apartments_user_id" ON "properties_apartments"("user_id");

-- CreateIndex
CREATE INDEX "idx_houses_country" ON "properties_houses"("country");

-- CreateIndex
CREATE INDEX "idx_houses_city" ON "properties_houses"("city");

-- CreateIndex
CREATE INDEX "idx_houses_user_status" ON "properties_houses"("user_id", "moderation_status");

-- CreateIndex
CREATE INDEX "idx_houses_property_type" ON "properties_houses"("property_type");

-- CreateIndex
CREATE INDEX "idx_houses_moderation_status" ON "properties_houses"("moderation_status");

-- CreateIndex
CREATE INDEX "idx_houses_user_id" ON "properties_houses"("user_id");

-- CreateIndex
CREATE INDEX "idx_debt_docs_property" ON "property_debt_documents"("property_id", "property_type");

-- CreateIndex
CREATE INDEX "idx_property_favorites_property" ON "property_favorites"("property_id", "property_table");

-- CreateIndex
CREATE INDEX "idx_property_favorites_user" ON "property_favorites"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "sqlite_autoindex_property_favorites_1" ON "property_favorites"("user_id", "property_id", "property_table");

-- CreateIndex
CREATE INDEX "idx_shares_property_buyer" ON "property_shares"("property_id", "property_type", "buyer_id");

-- CreateIndex
CREATE INDEX "idx_shares_status" ON "property_shares"("status");

-- CreateIndex
CREATE INDEX "idx_shares_buyer" ON "property_shares"("buyer_id");

-- CreateIndex
CREATE INDEX "idx_shares_property" ON "property_shares"("property_id", "property_type");

-- CreateIndex
CREATE INDEX "idx_property_translations_lookup" ON "property_translations"("property_id", "property_table");

-- CreateIndex
CREATE UNIQUE INDEX "sqlite_autoindex_property_translations_1" ON "property_translations"("property_id", "property_table", "lang_code");

-- CreateIndex
CREATE INDEX "idx_purchase_requests_property_id_table" ON "purchase_requests"("property_id", "property_table");

-- CreateIndex
CREATE INDEX "idx_purchase_requests_created_at" ON "purchase_requests"("created_at");

-- CreateIndex
CREATE INDEX "idx_purchase_requests_status" ON "purchase_requests"("status");

-- CreateIndex
CREATE INDEX "idx_purchase_requests_property_id" ON "purchase_requests"("property_id");

-- CreateIndex
CREATE INDEX "idx_purchase_requests_seller_id" ON "purchase_requests"("seller_id");

-- CreateIndex
CREATE INDEX "idx_purchase_requests_buyer_id" ON "purchase_requests"("buyer_id");

-- CreateIndex
CREATE UNIQUE INDEX "sqlite_autoindex_stripe_payments_1" ON "stripe_payments"("dedupe_key");

-- CreateIndex
CREATE INDEX "idx_stripe_payments_paid_at" ON "stripe_payments"("paid_at");

-- CreateIndex
CREATE INDEX "idx_stripe_payments_user" ON "stripe_payments"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "sqlite_autoindex_stripe_subscription_state_1" ON "stripe_subscription_state"("stripe_subscription_id");

-- CreateIndex
CREATE INDEX "idx_stripe_sub_state_subscription" ON "stripe_subscription_state"("stripe_subscription_id");

-- CreateIndex
CREATE INDEX "idx_stripe_wallet_deposit_user" ON "stripe_wallet_deposit_credits"("user_id");

-- CreateIndex
CREATE INDEX "idx_tdb_status" ON "test_drive_bookings"("status");

-- CreateIndex
CREATE INDEX "idx_tdb_user" ON "test_drive_bookings"("user_id");

-- CreateIndex
CREATE INDEX "idx_tdb_property" ON "test_drive_bookings"("property_id", "property_table");

-- CreateIndex
CREATE INDEX "idx_transactions_created_at" ON "transactions"("created_at");

-- CreateIndex
CREATE INDEX "idx_transactions_type" ON "transactions"("type");

-- CreateIndex
CREATE INDEX "idx_transactions_user_id" ON "transactions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "sqlite_autoindex_users_1" ON "users"("phone_number");

-- CreateIndex
CREATE INDEX "idx_users_username" ON "users"("username");

-- CreateIndex
CREATE INDEX "idx_users_telegram_id" ON "users"("telegram_id");

-- CreateIndex
CREATE INDEX "idx_users_id_number" ON "users"("user_id_number");

-- CreateIndex
CREATE INDEX "idx_users_has_card" ON "users"("has_card");

-- CreateIndex
CREATE INDEX "idx_users_is_blocked" ON "users"("is_blocked");

-- CreateIndex
CREATE INDEX "idx_users_role" ON "users"("role");

-- CreateIndex
CREATE INDEX "idx_users_phone" ON "users"("phone_number");

-- CreateIndex
CREATE INDEX "idx_users_email" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sqlite_autoindex_whatsapp_users_1" ON "whatsapp_users"("phone_number");

-- CreateIndex
CREATE INDEX "idx_whatsapp_users_last_message_at" ON "whatsapp_users"("last_message_at");

-- CreateIndex
CREATE INDEX "idx_whatsapp_users_is_active" ON "whatsapp_users"("is_active");

-- CreateIndex
CREATE INDEX "idx_whatsapp_users_country" ON "whatsapp_users"("country");

-- CreateIndex
CREATE INDEX "idx_whatsapp_users_phone_clean" ON "whatsapp_users"("phone_number_clean");

-- CreateIndex
CREATE INDEX "idx_whatsapp_users_phone" ON "whatsapp_users"("phone_number");

-- AddForeignKey
ALTER TABLE "administrators" ADD CONSTRAINT "administrators_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "administrators"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "assistant_leads" ADD CONSTRAINT "assistant_leads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "auction_winners" ADD CONSTRAINT "auction_winners_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bids" ADD CONSTRAINT "bids_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bonus_task_submissions" ADD CONSTRAINT "bonus_task_submissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "crm_leads"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "crm_leads" ADD CONSTRAINT "crm_leads_assistant_lead_id_fkey" FOREIGN KEY ("assistant_lead_id") REFERENCES "assistant_leads"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "crm_leads" ADD CONSTRAINT "crm_leads_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "crm_stages"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "crm_leads" ADD CONSTRAINT "crm_leads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "properties_apartments" ADD CONSTRAINT "properties_apartments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "properties_houses" ADD CONSTRAINT "properties_houses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "property_favorites" ADD CONSTRAINT "property_favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "property_shares" ADD CONSTRAINT "property_shares_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stripe_payments" ADD CONSTRAINT "stripe_payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stripe_subscription_state" ADD CONSTRAINT "stripe_subscription_state_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stripe_wallet_deposit_credits" ADD CONSTRAINT "stripe_wallet_deposit_credits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "test_drive_bookings" ADD CONSTRAINT "test_drive_bookings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

