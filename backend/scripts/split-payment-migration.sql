-- Run before deploying split-payment backend (safe to re-run).
-- Drops one-payment-per-sale constraint; existing rows are kept.

ALTER TABLE sale_payments DROP CONSTRAINT IF EXISTS "UQ_sale_payments_saleId";
ALTER TABLE sale_payments DROP CONSTRAINT IF EXISTS "UQ_e573deaf1d34ddc5ed48612d2d0";

-- Customer flags (backfill from legacy type column if present)
ALTER TABLE customer ADD COLUMN IF NOT EXISTS "isWholesale" boolean NOT NULL DEFAULT false;
ALTER TABLE customer ADD COLUMN IF NOT EXISTS "creditEnabled" boolean NOT NULL DEFAULT false;

UPDATE customer SET "isWholesale" = true WHERE type = 'WHOLESALE' AND "isWholesale" = false;
UPDATE customer SET "creditEnabled" = true WHERE type = 'CREDIT' AND "creditEnabled" = false;
