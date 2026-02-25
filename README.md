# ToshaCity Butchery Management System

A comprehensive management system for small to medium-sized butcheries to track stock, sales, wastage, and generate reports.

## Features

- 📦 **Stock Management**: Track opening stock, incoming stock, and leftover stock
- 💰 **Sales Processing**: Record sales with multiple payment methods (Cash, MPESA, Credit)
- 📊 **Reports**: Generate comprehensive reports for sales, stock, and wastage
- 👥 **Customer & Supplier Management**: Manage credit customers and suppliers
- 🔐 **User Management**: Role-based access control (Admin, Cashier)
- 📸 **Wastage Tracking**: Record wastage with photo evidence

## Tech Stack

- **Backend**: NestJS, TypeORM, PostgreSQL
- **Frontend**: Next.js, React, Tailwind CSS
- **Deployment**: Docker, Docker Compose, GitHub Actions

## Quick Start

### Development

```bash
# Start all services locally (uses localhost URLs)
./.dev.sh

# Or use docker-compose directly
docker-compose up

# Services run on:
# Backend API: http://localhost:4515/api
# Frontend: http://localhost:3015
```

### Production Deployment

```bash
# Deploy to production server (uses domain URLs)
./.deployment.sh

# Or use docker-compose directly
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d
```

See [`DEPLOYMENT.md`](./DEPLOYMENT.md) for complete deployment instructions.

**Quick Steps:**
1. Add GitHub Secrets (see [`GITHUB_SECRETS.md`](./GITHUB_SECRETS.md))
2. Set up SSH keys (see [`SSH_SETUP_GUIDE.md`](./SSH_SETUP_GUIDE.md))
3. Push to `development` branch to trigger deployment

## Deployment Scripts

Two deployment scripts are available:

### `.dev.sh` - Local Development
```bash
./.dev.sh
```
- Uses `docker-compose.yml` (localhost URLs)
- Uses `.env` file (optional, has defaults)
- Health checks via `http://localhost:4515` and `http://localhost:3015`
- Starts services sequentially with proper logging

### `.deployment.sh` - Production Deployment
```bash
./.deployment.sh
```
- Uses `docker-compose.prod.yml` (domain URLs)
- Requires `.env.production` file
- Pulls latest code from `development` branch
- Health checks via production domains
- Starts services sequentially with proper logging

**Features:**
- ✅ Starts services sequentially (one after another)
- ✅ Health checks for each service
- ✅ Proper logging with timestamps
- ✅ Retry logic for health checks
- ✅ Optimized for minimal resources

## Documentation

- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Complete deployment guide
- **[SERVER_SETUP.md](./SERVER_SETUP.md)** - **Server setup guide (create .env.production)**
- **[SSH_SETUP_GUIDE.md](./SSH_SETUP_GUIDE.md)** - SSH key setup for GitHub Actions
- **[GITHUB_SECRETS.md](./GITHUB_SECRETS.md)** - GitHub secrets configuration

## Production URLs

- **Backend API**: `https://apis.toshacity.co.ke`
- **Frontend**: `https://admin.toshacity.co.ke`
- **API Docs**: `https://apis.toshacity.co.ke/api/docs`

## Default Credentials

- **Username**: `admin`
- **Email**: `admin@toshacity.co.ke`
- **Password**: `admin123`

⚠️ **Change the default password immediately after first login!**

## License

Proprietary - All rights reserved
