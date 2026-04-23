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

### Local stack (Docker)

```bash
# Down, prune stopped/dangling images, rebuild, up, health checks (API + web)
./scripts/restart.sh

# If you changed DATABASE_USER / DATABASE_PASSWORD in .env but Postgres was already initialized, either
# put the old values back or wipe the local DB volume once (destructive): FRESH_DB=1 ./scripts/restart.sh

# Or compose only
docker compose up -d --build

# Services (defaults):
# Backend API: http://localhost:4515/api
# Frontend: http://localhost:3015
```

### Production deployment

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

**Quick Steps:** Add GitHub Secrets and SSH keys, create `.env.production` on the server, then push to `development` to trigger deployment. See [DEPLOYMENT.md](./DEPLOYMENT.md) for the full guide.

## Project Structure

- **`backend/`** – NestJS API (auth, users, roles, products, stock-sessions, stock-entries, sales, reports, suppliers, customers, uploads, activity-log)
- **`frontend/`** – Next.js app (dashboard, stock, sales, reports, admin: products, suppliers, customers, users, activity log, settings; auth: login, forgot/reset password)
- **`docker-compose.yml`** – Local development (db, backend, frontend)
- **`docker-compose.prod.yml`** – Production (domain URLs)
- **`scripts/restart.sh`** – Local: compose down, prune, rebuild, up, Postgres + API + frontend checks

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
