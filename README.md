# ToshaCity Butchery Management System

A comprehensive management system for small to medium-sized butcheries to track stock, sales, wastage, and generate reports.

## Features

- 📦 **Stock Management**: Track opening stock, incoming stock, closing stock, and byproducts (parent/child products)
- 💰 **Sales Processing**: Record sales with multiple payment methods (Cash, MPESA, Credit)
- 📊 **Reports**: Generate sales, stock, wastage, and weekly reports; export to Excel
- 👥 **Customer & Supplier Management**: Manage credit customers and suppliers
- 🔐 **User Management**: Role-based access control (Admin, Cashier); forgot password / reset password
- 📸 **Wastage Tracking**: Record wastage with optional photo evidence (local or Cloudinary)
- 📋 **Activity Log**: Audit trail of user actions (admin only)

## Tech Stack

- **Backend**: NestJS 11, TypeORM, PostgreSQL, Swagger (API docs), JWT auth
- **Frontend**: Next.js 16, React 19, Tailwind CSS 4, Chart.js, react-toastify, xlsx (Excel export)
- **Uploads**: Multer; optional Cloudinary for wastage photos
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

**Quick Steps:** Add GitHub Secrets and SSH keys, create `.env.production` on the server, then push to `development` to trigger deployment. See [DEPLOYMENT.md](./DEPLOYMENT.md) for the full guide.

## Project Structure

- **`backend/`** – NestJS API (auth, users, roles, products, stock-sessions, stock-entries, sales, reports, suppliers, customers, uploads, activity-log)
- **`frontend/`** – Next.js app (dashboard, stock, sales, reports, admin: products, suppliers, customers, users, activity log, settings; auth: login, forgot/reset password)
- **`docker-compose.yml`** – Local development (db, backend, frontend)
- **`docker-compose.prod.yml`** – Production (domain URLs)
- **`.dev.sh`** / **`.deployment.sh`** – Start dev or production stack with health checks

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

- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Full deployment guide: server setup, `.env.production`, GitHub Secrets, SSH setup, and deployment methods

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
