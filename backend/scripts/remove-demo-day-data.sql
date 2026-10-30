-- Removes the demo day rows the backend inserted on every restart while SEED_DEMO_DAY was on.
-- They are all tagged notes = 'local-demo-day': opening stock (Pork 18.5 kg, Maize flour 8 kg),
-- the ugali / fried pork production runs and their ingredient usage, and the two demo recipes.
--
-- docker exec -i laketown-db psql -U laketown -d laketown_butchery < backend/scripts/remove-demo-day-data.sql
--
-- It runs inside a transaction and ends with ROLLBACK, so the first run only shows what would go.
-- Check the counts, then change ROLLBACK to COMMIT and run it again.
-- The demo products (Pork, ugali, Maize flour, Fried pork) are left alone; delete or deactivate
-- them from Admin > Products if the shop does not use them.

BEGIN;

SELECT 'stock entries' AS what, COUNT(*) FROM stock_entry WHERE notes = 'local-demo-day'
UNION ALL
SELECT 'production runs', COUNT(*) FROM production_run WHERE notes = 'local-demo-day'
UNION ALL
SELECT 'demo recipes', COUNT(*) FROM recipe WHERE notes = 'local-demo-day';

SELECT s.id AS session_id, s.date, s.status, p.name AS product, e.type, e.quantity
FROM stock_entry e
JOIN stock_session s ON s.id = e."sessionId"
JOIN product p ON p.id = e."productId"
WHERE e.notes = 'local-demo-day'
ORDER BY s.date, p.name;

DELETE FROM stock_entry WHERE notes = 'local-demo-day';
DELETE FROM production_run WHERE notes = 'local-demo-day';

-- Recipes the staff went on to use for real production are kept.
DELETE FROM recipe r
WHERE r.notes = 'local-demo-day'
  AND NOT EXISTS (SELECT 1 FROM production_run pr WHERE pr."recipeId" = r.id);

ROLLBACK;
