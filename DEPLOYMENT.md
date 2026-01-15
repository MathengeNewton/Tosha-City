# Deployment Guide

This document provides instructions for deploying ToshaCity Butchery to production.

## Prerequisites

1. **Server Requirements:**
   - Ubuntu 20.04+ or similar Linux distribution
   - Docker and Docker Compose installed
   - Git installed
   - SSH access configured
   - Domain names configured:
     - `apis.toshacity.co.ke` → Backend API
     - `admin.toshacity.co.ke` → Frontend Application

2. **SSL Certificates:**
   - SSL certificates should be placed in `proxy/ssl/`:
     - `fullchain.pem` - Full certificate chain
     - `privkey.pem` - Private key
   - You can use Let's Encrypt with Certbot to generate certificates

## GitHub Secrets Configuration

Add the following secrets to your GitHub repository (Settings → Secrets and variables → Actions):

### Required Secrets

1. **SSH_HOST** - Production server IP or hostname
   - Example: `123.456.789.0` or `server.toshacity.co.ke`

2. **SSH_USER** - SSH username for deployment
   - Example: `deploy` or `ubuntu`

3. **SSH_PRIVATE_KEY** - Private SSH key for server access
   - Generate with: `ssh-keygen -t ed25519 -C "deploy@toshacity"`
   - Copy the private key content (including `-----BEGIN` and `-----END` lines)

4. **SSH_PORT** - SSH port (optional, defaults to 22)
   - Example: `22`

5. **DEPLOY_PATH** - Path on server where code is deployed
   - Example: `/var/www/toshacity` or `/home/deploy/toshacity`

6. **DATABASE_USER** - PostgreSQL database user
   - Example: `toshacity`

7. **DATABASE_PASSWORD** - PostgreSQL database password
   - Use a strong, unique password

8. **DATABASE_NAME** - PostgreSQL database name
   - Example: `toshacity_butchery`

9. **JWT_SECRET** - Secret key for JWT token signing
   - Generate with: `openssl rand -base64 32`
   - Use a strong, random string

10. **JWT_EXPIRES_IN** - JWT token expiration time (optional)
    - Example: `7d` (7 days)

11. **FRONTEND_URL** - Frontend application URL
    - Example: `https://admin.toshacity.co.ke`

12. **NEXT_PUBLIC_API_URL** - Public API URL (used by frontend)
    - Example: `https://apis.toshacity.co.ke/api`

### Optional Secrets

- **GITHUB_TOKEN** - Automatically provided by GitHub Actions
- **DOCKER_REGISTRY** - If using a private Docker registry

## Initial Server Setup

### 1. Install Docker and Docker Compose

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add user to docker group (replace $USER with your username)
sudo usermod -aG docker $USER
```

### 2. Clone Repository

```bash
# Create deployment directory
sudo mkdir -p /var/www/toshacity
sudo chown $USER:$USER /var/www/toshacity

# Clone repository
cd /var/www/toshacity
git clone <your-repo-url> .
```

### 3. Set Up SSL Certificates

```bash
# Install Certbot
sudo apt install certbot -y

# Generate certificates for both domains
sudo certbot certonly --standalone -d apis.toshacity.co.ke -d admin.toshacity.co.ke

# Copy certificates to project directory
sudo mkdir -p /var/www/toshacity/proxy/ssl
sudo cp /etc/letsencrypt/live/apis.toshacity.co.ke/fullchain.pem /var/www/toshacity/proxy/ssl/
sudo cp /etc/letsencrypt/live/apis.toshacity.co.ke/privkey.pem /var/www/toshacity/proxy/ssl/
sudo chown -R $USER:$USER /var/www/toshacity/proxy/ssl
```

### 4. Create Environment File

```bash
# Create .env.production file
cat > .env.production << EOF
DATABASE_USER=toshacity
DATABASE_PASSWORD=your_strong_password_here
DATABASE_NAME=toshacity_butchery
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d
FRONTEND_URL=https://admin.toshacity.co.ke
NEXT_PUBLIC_API_URL=https://apis.toshacity.co.ke/api
EOF

# Secure the file
chmod 600 .env.production
```

### 5. Configure Firewall

```bash
# Allow HTTP, HTTPS, and SSH
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 6. Set Up SSH Key for GitHub Actions

```bash
# Generate SSH key pair
ssh-keygen -t ed25519 -C "deploy@toshacity" -f ~/.ssh/deploy_key

# Add public key to authorized_keys
cat ~/.ssh/deploy_key.pub >> ~/.ssh/authorized_keys

# Display private key (copy this to GitHub Secrets → SSH_PRIVATE_KEY)
cat ~/.ssh/deploy_key
```

## Deployment Methods

### Method 1: Automated Deployment via GitHub Actions (Recommended)

1. Push code to `main` or `master` branch
2. GitHub Actions will automatically:
   - Build Docker images
   - Push to GitHub Container Registry
   - SSH into production server
   - Pull latest code and images
   - Deploy using docker-compose

### Method 2: Manual Deployment

```bash
# SSH into production server
ssh user@your-server

# Navigate to project directory
cd /var/www/toshacity

# Pull latest code
git pull origin main

# Run deployment script
chmod +x deploy.sh
./deploy.sh
```

### Method 3: Direct Docker Compose

```bash
# Navigate to project directory
cd /var/www/toshacity

# Copy production nginx config
cp proxy/nginx.prod.conf proxy/nginx.conf

# Deploy
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

## Post-Deployment

### 1. Verify Deployment

```bash
# Check container status
docker-compose -f docker-compose.prod.yml ps

# Check logs
docker-compose -f docker-compose.prod.yml logs -f

# Test endpoints
curl https://apis.toshacity.co.ke/api/health
curl https://admin.toshacity.co.ke
```

### 2. Set Up SSL Certificate Auto-Renewal

```bash
# Test renewal
sudo certbot renew --dry-run

# Certbot will auto-renew, but you may need to reload nginx
# Add to crontab:
sudo crontab -e
# Add: 0 0 * * * certbot renew --quiet && docker-compose -f /var/www/toshacity/docker-compose.prod.yml restart proxy
```

### 3. Set Up Database Backups

```bash
# Create backup script
cat > /var/www/toshacity/backup-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/toshacity"
mkdir -p $BACKUP_DIR
docker exec toshacity_db_1 pg_dump -U toshacity toshacity_butchery > $BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).sql
# Keep only last 7 days
find $BACKUP_DIR -name "backup_*.sql" -mtime +7 -delete
EOF

chmod +x /var/www/toshacity/backup-db.sh

# Add to crontab (daily at 2 AM)
sudo crontab -e
# Add: 0 2 * * * /var/www/toshacity/backup-db.sh
```

## Troubleshooting

### Containers won't start

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs

# Check container status
docker-compose -f docker-compose.prod.yml ps

# Restart services
docker-compose -f docker-compose.prod.yml restart
```

### Database connection issues

```bash
# Check database container
docker exec -it toshacity_db_1 psql -U toshacity -d toshacity_butchery

# Check environment variables
docker exec toshacity-backend env | grep DATABASE
```

### SSL certificate issues

```bash
# Verify certificate files exist
ls -la proxy/ssl/

# Check nginx configuration
docker exec toshacity-proxy nginx -t

# View nginx logs
docker logs toshacity-proxy
```

### Frontend not loading

```bash
# Check frontend logs
docker logs toshacity-frontend

# Verify API URL is correct
docker exec toshacity-frontend env | grep NEXT_PUBLIC_API_URL

# Check network connectivity
docker network inspect toshacity_app-network
```

## Monitoring

### View Logs

```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f frontend
docker-compose -f docker-compose.prod.yml logs -f db
```

### Resource Usage

```bash
# Container stats
docker stats

# Disk usage
docker system df
```

## Rollback

If deployment fails, you can rollback:

```bash
# Stop current containers
docker-compose -f docker-compose.prod.yml down

# Checkout previous version
git checkout <previous-commit-hash>

# Redeploy
./deploy.sh
```

## Security Checklist

- [ ] Strong database password set
- [ ] JWT secret is random and secure
- [ ] SSL certificates installed and valid
- [ ] Firewall configured (only 22, 80, 443 open)
- [ ] SSH key-based authentication enabled
- [ ] `.env.production` file permissions set to 600
- [ ] Regular database backups configured
- [ ] SSL certificate auto-renewal configured
- [ ] Docker images are up to date
- [ ] No sensitive data in git repository

## Support

For issues or questions, please contact the development team or create an issue in the repository.

