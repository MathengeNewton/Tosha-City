# Server Troubleshooting Guide

## Issue: Database won't start - "POSTGRES_PASSWORD not specified"

### Symptoms
- Error: "Database is uninitialized and superuser password is not specified"
- Warning: "The DATABASE_PASSWORD variable is not set. Defaulting to a blank string."

### Root Cause
The `.env.production` file is either:
1. Missing
2. Has incorrect format
3. Has empty or missing `DATABASE_PASSWORD`

### Solution

#### Step 1: Verify .env.production exists
```bash
ls -la .env.production
```

#### Step 2: Check file format
The file should have NO spaces around the `=` sign:
```bash
# ✅ CORRECT
DATABASE_PASSWORD=your_password_here

# ❌ WRONG (has spaces)
DATABASE_PASSWORD = your_password_here
```

#### Step 3: Verify DATABASE_PASSWORD is set
```bash
# Check if line exists
grep DATABASE_PASSWORD .env.production

# Check if it has a value (should show something after =)
grep DATABASE_PASSWORD .env.production | grep -v "^#" | grep "=" | grep -v "^$"
```

#### Step 4: Test loading the env file
```bash
source .env.production
echo "DATABASE_PASSWORD length: ${#DATABASE_PASSWORD}"
# Should show a number > 0
```

#### Step 5: Test docker-compose can read it
```bash
docker compose -f docker-compose.prod.yml --env-file .env.production config | grep POSTGRES_PASSWORD
# Should show: POSTGRES_PASSWORD: your_password_here
```

#### Step 6: Recreate .env.production (if needed)
```bash
cd /home/newton/projects/Tosha-City

# Generate secure passwords
DATABASE_PASSWORD=$(openssl rand -base64 24)
JWT_SECRET=$(openssl rand -base64 32)

# Create file with correct format (NO spaces around =)
cat > .env.production << EOF
DATABASE_USER=toshacity
DATABASE_PASSWORD=${DATABASE_PASSWORD}
DATABASE_NAME=toshacity_butchery
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=7d
FRONTEND_URL=https://admin.toshacity.co.ke
NEXT_PUBLIC_API_URL=https://apis.toshacity.co.ke/api
