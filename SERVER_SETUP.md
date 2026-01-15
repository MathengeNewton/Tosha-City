# Server Setup Guide

## Initial Setup on Production Server

### 1. Create `.env.production` File

The `.env.production` file is **REQUIRED** for production deployment. Create it in the project root:

```bash
cd /home/newton/projects/Tosha-City
cat > .env.production << 'ENVEOF'
# Database Configuration
DATABASE_USER=toshacity
DATABASE_PASSWORD=YOUR_SECURE_PASSWORD_HERE
DATABASE_NAME=toshacity_butchery

# JWT Configuration
JWT_SECRET=YOUR_JWT_SECRET_HERE
JWT_EXPIRES_IN=7d

# Application URLs
FRONTEND_URL=https://admin.toshacity.co.ke
NEXT_PUBLIC_API_URL=https://apis.toshacity.co.ke/api
ENVEOF
```

### 2. Generate Secure Passwords

**Generate Database Password:**
```bash
openssl rand -base64 24
```

**Generate JWT Secret:**
```bash
openssl rand -base64 32
```

### 3. Set File Permissions

```bash
chmod 600 .env.production
```

### 4. Start Services

```bash
./start-services.sh
```

## Important Notes

- **Never commit `.env.production` to git** - it's already in `.gitignore`
- **Keep backups** of your `.env.production` file in a secure location
- **Change default passwords** if you're using the example values
- The script will **fail fast** if `.env.production` is missing (for production mode)

## Troubleshooting

### Error: "DATABASE_PASSWORD variable is not set"
- Make sure `.env.production` exists
- Check that `DATABASE_PASSWORD` is set in the file
- Verify file permissions (should be readable)

### Error: "JWT_SECRET variable is not set"
- Make sure `JWT_SECRET` is set in `.env.production`
- Generate a new secret using `openssl rand -base64 32`

### Database won't start
- Check that `DATABASE_PASSWORD` is not empty
- Verify PostgreSQL container logs: `docker compose logs db`
