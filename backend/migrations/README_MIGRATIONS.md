# Database Migrations

## Running Migrations

### Using psql (PostgreSQL CLI)
```bash
# Connect to database
psql -U church -d church360 -h localhost -p 5455

# Run migration
\i migrations/001-families-redesign.sql

# Or from command line
psql -U church -d church360 -h localhost -p 5455 -f migrations/001-families-redesign.sql
```

### Using Docker
```bash
# Copy migration file to container
docker cp backend/migrations/001-families-redesign.sql church360-backend:/tmp/

# Execute migration
docker exec -i church360-backend psql -U church -d church360 < /tmp/001-families-redesign.sql
```

### Using TypeORM (if configured)
```bash
cd backend
npm run migration:run
```

---

## Migration: 001-families-redesign.sql

### Changes:
1. ✅ Add `userType` column to `users` table
2. ✅ Make `email` nullable in `users` table
3. ✅ Create `family_members` join table
4. ✅ Create indexes for performance
5. ✅ Migrate existing data (if `headId` exists)
6. ✅ Drop `headId` column from `families` table

### Rollback (if needed):
```sql
-- Restore headId column (if needed)
ALTER TABLE families ADD COLUMN "headId" INTEGER REFERENCES users(id);

-- Migrate data back (if needed)
UPDATE families f
SET "headId" = (
  SELECT "userId" 
  FROM family_members fm 
  WHERE fm."familyId" = f.id 
  AND fm.role = 'PRIMARY_MEMBER' 
  LIMIT 1
);

-- Drop family_members table
DROP TABLE IF EXISTS family_members;

-- Remove userType column
ALTER TABLE users DROP COLUMN IF EXISTS "userType";

-- Make email NOT NULL again (if needed)
ALTER TABLE users ALTER COLUMN email SET NOT NULL;
```

---

## Verification

After running migration, verify with:
```sql
-- Check user types
SELECT "userType", COUNT(*) 
FROM users 
GROUP BY "userType";

-- Check family members
SELECT f.name, fm.role, u.username
FROM families f
JOIN family_members fm ON f.id = fm."familyId"
JOIN users u ON fm."userId" = u.id
ORDER BY f.id, fm.role;
```



