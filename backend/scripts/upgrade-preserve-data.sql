-- Preserve existing rows: split payments, customer flags (branches → 000-bootstrap-branches.sql).
-- Safe to re-run. Applied from host backend/scripts via scripts/run-db-migrations.sh.

-- ---------------------------------------------------------------------------
-- Split payments: allow multiple rows per sale
-- ---------------------------------------------------------------------------
ALTER TABLE sale_payments DROP CONSTRAINT IF EXISTS "UQ_sale_payments_saleId";
ALTER TABLE sale_payments DROP CONSTRAINT IF EXISTS "UQ_e573deaf1d34ddc5ed48612d2d0";

-- ---------------------------------------------------------------------------
-- Customer wholesale / credit flags
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'customer'
  ) THEN
    ALTER TABLE customer ADD COLUMN IF NOT EXISTS "isWholesale" boolean NOT NULL DEFAULT false;
    ALTER TABLE customer ADD COLUMN IF NOT EXISTS "creditEnabled" boolean NOT NULL DEFAULT false;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'customer' AND column_name = 'type'
    ) THEN
      UPDATE customer SET "isWholesale" = true
      WHERE type::text = 'WHOLESALE' AND "isWholesale" = false;

      UPDATE customer SET "creditEnabled" = true
      WHERE type::text = 'CREDIT' AND "creditEnabled" = false;
    END IF;
  END IF;
END $$;
