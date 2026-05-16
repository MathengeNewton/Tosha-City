-- Remove multi-branch schema (idempotent). Run after deploying code without branch entities.
-- Preserves all other data; drops branch FKs/columns and branch table.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'stock_session'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'stock_session' AND column_name = 'branchId'
  ) THEN
    ALTER TABLE stock_session DROP CONSTRAINT IF EXISTS "FK_stock_session_branch";
    ALTER TABLE stock_session DROP CONSTRAINT IF EXISTS "FK_8a1c2b3d4e5f_stock_session_branchId";
    ALTER TABLE stock_session DROP COLUMN IF EXISTS "branchId";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'sale'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sale' AND column_name = 'branchId'
  ) THEN
    ALTER TABLE sale DROP CONSTRAINT IF EXISTS "FK_sale_branch";
    ALTER TABLE sale DROP CONSTRAINT IF EXISTS "FK_sale_branchId";
    ALTER TABLE sale DROP COLUMN IF EXISTS "branchId";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user' AND column_name = 'branchId'
  ) THEN
    ALTER TABLE "user" DROP CONSTRAINT IF EXISTS "FK_user_branch";
    ALTER TABLE "user" DROP CONSTRAINT IF EXISTS "FK_user_branchId";
    ALTER TABLE "user" DROP COLUMN IF EXISTS "branchId";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'production_run'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'production_run' AND column_name = 'branchId'
  ) THEN
    ALTER TABLE production_run DROP CONSTRAINT IF EXISTS "FK_production_run_branch";
    ALTER TABLE production_run DROP COLUMN IF EXISTS "branchId";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'restaurant_order'
  ) THEN
    ALTER TABLE restaurant_order DROP CONSTRAINT IF EXISTS "FK_restaurant_order_branch";
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'restaurant_order' AND column_name = 'branchId'
    ) THEN
      ALTER TABLE restaurant_order DROP COLUMN IF EXISTS "branchId";
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'product'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'product' AND column_name = 'branchScope'
  ) THEN
    ALTER TABLE product DROP COLUMN IF EXISTS "branchScope";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'recipe'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'recipe' AND column_name = 'branchScope'
  ) THEN
    ALTER TABLE recipe DROP COLUMN IF EXISTS "branchScope";
  END IF;
END $$;

DROP TABLE IF EXISTS restaurant_order_line CASCADE;
DROP TABLE IF EXISTS restaurant_order CASCADE;
DROP TABLE IF EXISTS branch CASCADE;

DROP TYPE IF EXISTS "public"."branch_type_enum";
DROP TYPE IF EXISTS "public"."recipe_branch_scope_enum";
DROP TYPE IF EXISTS "public"."branch_catalog_scope_enum";
