-- Catalog billing: prices, per-client limit/GST switches, monthly bills.
-- NEW TABLES ONLY. Nothing existing is altered; no enum is created or changed
-- (scope, kind and status are plain text).
--
-- Apply by hand, once, before deploying the code that reads these tables:
--   psql "$DIRECT_URL" -v ON_ERROR_STOP=1 -f prisma/migrations/20261028000000_catalog_billing/migration.sql
-- Safe to run twice.

CREATE TABLE IF NOT EXISTS "super_admin"."CatalogPrice" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "plan" TEXT,
    "clientId" TEXT,
    "kind" TEXT NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CatalogPrice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "super_admin"."CatalogBillingSetting" (
    "clientId" TEXT NOT NULL,
    "monthlyLimitPaise" INTEGER DEFAULT 500000,
    "gstEnabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogBillingSetting_pkey" PRIMARY KEY ("clientId")
);

CREATE TABLE IF NOT EXISTS "super_admin"."CatalogBill" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "lines" JSONB NOT NULL,
    "runCount" INTEGER NOT NULL,
    "subtotalPaise" INTEGER NOT NULL,
    "gstEnabled" BOOLEAN NOT NULL,
    "gstRateBp" INTEGER NOT NULL,
    "gstPaise" INTEGER NOT NULL,
    "totalPaise" INTEGER NOT NULL,
    "createdById" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogBill_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CatalogPrice_clientId_kind_effectiveFrom_idx" ON "super_admin"."CatalogPrice"("clientId", "kind", "effectiveFrom");
CREATE INDEX IF NOT EXISTS "CatalogPrice_plan_kind_effectiveFrom_idx" ON "super_admin"."CatalogPrice"("plan", "kind", "effectiveFrom");
CREATE UNIQUE INDEX IF NOT EXISTS "CatalogBill_number_key" ON "super_admin"."CatalogBill"("number");
CREATE INDEX IF NOT EXISTS "CatalogBill_period_idx" ON "super_admin"."CatalogBill"("period");
CREATE UNIQUE INDEX IF NOT EXISTS "CatalogBill_clientId_period_key" ON "super_admin"."CatalogBill"("clientId", "period");

DO $$ BEGIN
  ALTER TABLE "super_admin"."CatalogPrice" ADD CONSTRAINT "CatalogPrice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "super_admin"."Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "super_admin"."CatalogBillingSetting" ADD CONSTRAINT "CatalogBillingSetting_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "super_admin"."Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "super_admin"."CatalogBill" ADD CONSTRAINT "CatalogBill_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "super_admin"."Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- PLACEHOLDER default prices for every plan, from 1 January 2026 (India time):
-- Rs 100 per four-view catalog, Rs 60 per colour variant. Set the real prices
-- in the Platform Console (Catalog billing); a new price is a new row, so these
-- stay as the record of what applied before.
INSERT INTO "super_admin"."CatalogPrice" ("id", "scope", "plan", "kind", "amountPaise", "effectiveFrom", "note")
VALUES
  ('seed-default-catalog', 'PLAN', 'DEFAULT', 'CATALOG', 10000, '2025-12-31 18:30:00', 'PLACEHOLDER - set the real price in the Platform Console'),
  ('seed-default-colour-variant', 'PLAN', 'DEFAULT', 'COLOUR_VARIANT', 6000, '2025-12-31 18:30:00', 'PLACEHOLDER - set the real price in the Platform Console')
ON CONFLICT ("id") DO NOTHING;
