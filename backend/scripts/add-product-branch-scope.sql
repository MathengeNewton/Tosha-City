-- Optional manual steps when synchronize/nest cannot alter `product` cleanly.
-- With synchronize: true, TypeORM usually adds `branchScope` and enum `branch_catalog_scope_enum` automatically.

-- Example if you need to add the column by hand (adjust enum name if yours differs):
-- ALTER TYPE branch_catalog_scope_enum ADD VALUE IF NOT EXISTS 'ALL';
-- (PostgreSQL 9.1+ may require running new enum values in a transaction depending on version.)

-- ALTER TABLE product ADD COLUMN IF NOT EXISTS "branchScope" branch_catalog_scope_enum NOT NULL DEFAULT 'ALL';
