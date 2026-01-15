-- Migration: Families Redesign
-- Description: Add UserType, FamilyMember join table, and update schema
-- Date: 2025-01-XX

-- Step 1: Add userType column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS "userType" VARCHAR DEFAULT 'STANDALONE' 
CHECK ("userType" IN ('PRIMARY_MEMBER', 'SPOUSE', 'OFFSPRING', 'STANDALONE'));

-- Step 2: Make email nullable (for family members who might not have emails)
ALTER TABLE users 
ALTER COLUMN email DROP NOT NULL;

-- Step 3: Create family_members table (join table)
CREATE TABLE IF NOT EXISTS family_members (
  id SERIAL PRIMARY KEY,
  "familyId" INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR NOT NULL CHECK (role IN ('PRIMARY_MEMBER', 'SPOUSE', 'OFFSPRING')),
  relationship VARCHAR,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("familyId", "userId")
);

-- Step 4: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_family_members_family_id ON family_members("familyId");
CREATE INDEX IF NOT EXISTS idx_family_members_user_id ON family_members("userId");
CREATE INDEX IF NOT EXISTS idx_family_members_role ON family_members(role);
CREATE INDEX IF NOT EXISTS idx_users_user_type ON users("userType");

-- Step 5: Migrate existing data (if any families exist with headId)
-- Note: This assumes families table has a headId column that needs to be migrated
-- If headId doesn't exist, this will be skipped

DO $$
DECLARE
  family_record RECORD;
BEGIN
  -- Check if headId column exists
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'families' 
    AND column_name = 'headId'
  ) THEN
    -- Migrate existing families with headId to family_members
    FOR family_record IN 
      SELECT id, "headId" 
      FROM families 
      WHERE "headId" IS NOT NULL
    LOOP
      -- Insert primary member relationship
      INSERT INTO family_members ("familyId", "userId", role, relationship, "createdAt")
      VALUES (
        family_record.id,
        family_record."headId",
        'PRIMARY_MEMBER',
        'head',
        CURRENT_TIMESTAMP
      )
      ON CONFLICT DO NOTHING;
      
      -- Update user type to PRIMARY_MEMBER
      UPDATE users 
      SET "userType" = 'PRIMARY_MEMBER'
      WHERE id = family_record."headId" 
      AND "userType" = 'STANDALONE';
    END LOOP;
    
    -- Drop headId column after migration
    ALTER TABLE families DROP COLUMN IF EXISTS "headId";
  END IF;
END $$;

-- Step 6: Update all existing users to STANDALONE if userType is NULL
UPDATE users 
SET "userType" = 'STANDALONE' 
WHERE "userType" IS NULL;

-- Step 7: Ensure email uniqueness constraint still works (PostgreSQL handles this)
-- If you need to handle duplicate emails, you may want to:
-- ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;
-- CREATE UNIQUE INDEX users_email_unique ON users(email) WHERE email IS NOT NULL;

-- Verification queries (run these to verify migration)
-- SELECT COUNT(*) as total_users, "userType", COUNT(*) 
-- FROM users 
-- GROUP BY "userType";
-- 
-- SELECT COUNT(*) as total_families FROM families;
-- 
-- SELECT COUNT(*) as total_family_members FROM family_members;
-- 
-- SELECT f.id, f.name, COUNT(fm.id) as member_count
-- FROM families f
-- LEFT JOIN family_members fm ON f.id = fm."familyId"
-- GROUP BY f.id, f.name;



