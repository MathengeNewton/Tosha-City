# 🚀 ToshaCity Butchery - Deployment Ready!

Your application is now configured for production deployment with automated CI/CD pipelines.

## 📋 Quick Start

### 1. Add GitHub Secrets

Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions** and add all secrets listed in [`GITHUB_SECRETS.md`](./GITHUB_SECRETS.md).

**Required Secrets:**
- `SSH_HOST` - Your server IP/hostname
- `SSH_USER` - SSH username
- `SSH_PRIVATE_KEY` - SSH private key
- `DEPLOY_PATH` - Deployment directory path
- `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME`
- `JWT_SECRET` - Generate with: `openssl rand -base64 32`
- `FRONTEND_URL` - `https://admin.toshacity.co.ke`
- `NEXT_PUBLIC_API_URL` - `https://apis.toshacity.co.ke/api`

### 2. Initial Server Setup

Follow the detailed instructions in [`DEPLOYMENT.md`](./DEPLOYMENT.md) to:
- Install Docker and Docker Compose
- Set up SSL certificates
- Configure firewall
- Set up SSH keys

### 3. Deploy!

**Automatic Deployment (Recommended):**
- Push to `main` or `master` branch
- GitHub Actions will automatically deploy

**Manual Deployment:**
```bash
ssh user@your-server
cd /var/www/toshacity
git pull
./deploy.sh
```

## 📁 Files Created

- **`.github/workflows/deploy.yml`** - GitHub Actions CI/CD pipeline
- **`docker-compose.prod.yml`** - Production Docker Compose configuration
- **`proxy/nginx.prod.conf`** - Production Nginx configuration with SSL
- **`deploy.sh`** - Manual deployment script
- **`DEPLOYMENT.md`** - Complete deployment guide
- **`GITHUB_SECRETS.md`** - GitHub secrets documentation
- **`.env.example`** - Environment variables template

## 🌐 Production URLs

- **Backend API:** `https://apis.toshacity.co.ke`
- **Frontend:** `https://admin.toshacity.co.ke`
- **API Docs:** `https://apis.toshacity.co.ke/api/docs`

## 🔒 Security Checklist

Before deploying, ensure:
- [ ] All GitHub secrets are configured
- [ ] Strong database password set
- [ ] JWT secret is random (use `openssl rand -base64 32`)
- [ ] SSL certificates installed in `proxy/ssl/`
- [ ] Firewall configured (ports 22, 80, 443 only)
- [ ] SSH key-based authentication enabled
- [ ] `.env.production` file permissions set to 600

## 📚 Documentation

- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Complete deployment guide
- **[SSH_SETUP_GUIDE.md](./SSH_SETUP_GUIDE.md)** - Detailed SSH key setup guide
- **[QUICK_SSH_SETUP.md](./QUICK_SSH_SETUP.md)** - Quick 5-minute SSH setup
- **[GITHUB_SECRETS.md](./GITHUB_SECRETS.md)** - GitHub secrets setup
- **[.env.example](./.env.example)** - Environment variables template

## 🆘 Troubleshooting

See the troubleshooting section in [`DEPLOYMENT.md`](./DEPLOYMENT.md) for common issues and solutions.

## ✅ Next Steps

1. Add all GitHub secrets
2. Set up your production server
3. Configure SSL certificates
4. Push to main branch to trigger deployment
5. Monitor deployment in GitHub Actions

Happy deploying! 🎉

