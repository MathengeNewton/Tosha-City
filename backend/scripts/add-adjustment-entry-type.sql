-- Run once on an existing database if TypeORM synchronize did not add the new stock entry value.
-- Find enum name: SELECT typname FROM pg_type WHERE typtype = 'e' AND typname LIKE '%stock%';
ALTER TYPE stock_entry_type_enum ADD VALUE IF NOT EXISTS 'ADJUSTMENT';

-- Production history should survive editing or removing a recipe ingredient.
-- Find the constraint: \d production_run_ingredient
-- ALTER TABLE production_run_ingredient DROP CONSTRAINT <fk_name>;
-- ALTER TABLE production_run_ingredient
--   ADD CONSTRAINT fk_production_run_ingredient_recipe_ingredient
--   FOREIGN KEY ("recipeIngredientId") REFERENCES recipe_ingredient(id) ON DELETE SET NULL;
