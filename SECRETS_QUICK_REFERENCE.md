# 🔐 GitHub Secrets - Quick Reference

Copy and paste this list when adding secrets to GitHub:

## Required Secrets (Add to GitHub → Settings → Secrets → Actions)

```
SSH_HOST = your-server-ip-or-hostname
SSH_USER = deploy (or your username)
SSH_PRIVATE_KEY = -----BEGIN OPENSSH PRIVATE KEY-----
                  [your full private key content]
                  -----END OPENSSH PRIVATE KEY-----
SSH_PORT = 22 (optional)
DEPLOY_PATH = /var/www/toshacity (or your deployment path)

DATABASE_USER = toshacity
DATABASE_PASSWORD = [generate with: openssl rand -base64 24]
DATABASE_NAME = toshacity_butchery

JWT_SECRET = [generate with: openssl rand -base64 32]
JWT_EXPIRES_IN = 7d

FRONTEND_URL = https://admin.toshacity.co.ke
NEXT_PUBLIC_API_URL = https://apis.toshacity.co.ke/api
```

## Quick Commands to Generate Secrets

```bash
# Generate JWT Secret
openssl rand -base64 32

# Generate Database Password
openssl rand -base64 24

# Generate SSH Key
ssh-keygen -t ed25519 -C "deploy@toshacity" -f ~/.ssh/deploy_key
# Then copy ~/.ssh/deploy_key content to SSH_PRIVATE_KEY
# And add ~/.ssh/deploy_key.pub to server's ~/.ssh/authorized_keys
```

## Checklist

- [ ] SSH_HOST
- [ ] SSH_USER  
- [ ] SSH_PRIVATE_KEY
- [ ] SSH_PORT (optional)
- [ ] DEPLOY_PATH
- [ ] DATABASE_USER
- [ ] DATABASE_PASSWORD
- [ ] DATABASE_NAME
- [ ] JWT_SECRET
- [ ] JWT_EXPIRES_IN (optional)
- [ ] FRONTEND_URL
- [ ] NEXT_PUBLIC_API_URL

## Notes

- **SSH_PRIVATE_KEY**: Must include the full key with `-----BEGIN` and `-----END` lines
- **JWT_SECRET**: Use a strong random string (32+ characters)
- **DATABASE_PASSWORD**: Use a strong password (16+ characters)
- All secrets are encrypted by GitHub and never exposed in logs

