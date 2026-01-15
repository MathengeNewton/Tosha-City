# GitHub Secrets Configuration

This document lists all the secrets that need to be added to your GitHub repository for automated deployment.

## How to Add Secrets

1. Go to your GitHub repository
2. Click on **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret below

## Required Secrets

### SSH Configuration

| Secret Name | Description | Example Value |
|------------|-------------|---------------|
| `SSH_HOST` | Production server IP address or hostname | `123.456.789.0` or `server.toshacity.co.ke` |
| `SSH_USER` | SSH username for server access | `deploy` or `ubuntu` |
| `SSH_PRIVATE_KEY` | Private SSH key content (full key including headers) | `-----BEGIN OPENSSH PRIVATE KEY-----<key content>-----END OPENSSH PRIVATE KEY-----` |
| `SSH_PORT` | SSH port (optional, defaults to 22) | `22` |

**How to generate SSH key:**
```bash
ssh-keygen -t ed25519 -C "deploy@toshacity" -f ~/.ssh/deploy_key
# Copy the content of ~/.ssh/deploy_key (private key) to SSH_PRIVATE_KEY
# Add ~/.ssh/deploy_key.pub (public key) to server's ~/.ssh/authorized_keys
```

### Deployment Path

| Secret Name | Description | Example Value |
|------------|-------------|---------------|
| `DEPLOY_PATH` | Absolute path on server where code is deployed | `/var/www/toshacity` or `/home/deploy/toshacity` |

### Database Configuration

| Secret Name | Description | Example Value |
|------------|-------------|---------------|
| `DATABASE_USER` | PostgreSQL database username | `toshacity` |
| `DATABASE_PASSWORD` | PostgreSQL database password (use strong password) | `YourStrongPassword123!@#` |
| `DATABASE_NAME` | PostgreSQL database name | `toshacity_butchery` |

**How to generate strong password:**
```bash
openssl rand -base64 32
```

### JWT Configuration

| Secret Name | Description | Example Value |
|------------|-------------|---------------|
| `JWT_SECRET` | Secret key for JWT token signing (must be strong and random) | Generate with: `openssl rand -base64 32` |
| `JWT_EXPIRES_IN` | JWT token expiration time (optional) | `7d` (7 days) or `24h` (24 hours) |

**How to generate JWT secret:**
```bash
openssl rand -base64 32
```

### Application URLs

| Secret Name | Description | Example Value |
|------------|-------------|---------------|
| `FRONTEND_URL` | Frontend application URL | `https://admin.toshacity.co.ke` |
| `NEXT_PUBLIC_API_URL` | Public API URL (used by frontend to connect to backend) | `https://apis.toshacity.co.ke/api` |

## Complete List of All Secrets

Copy this list and check off each secret as you add it:

- [ ] `SSH_HOST` - Production server hostname/IP
- [ ] `SSH_USER` - SSH username
- [ ] `SSH_PRIVATE_KEY` - SSH private key content
- [ ] `SSH_PORT` - SSH port (optional, defaults to 22)
- [ ] `DEPLOY_PATH` - Deployment directory path
- [ ] `DATABASE_USER` - Database username
- [ ] `DATABASE_PASSWORD` - Database password
- [ ] `DATABASE_NAME` - Database name
- [ ] `JWT_SECRET` - JWT signing secret
- [ ] `JWT_EXPIRES_IN` - JWT expiration (optional)
- [ ] `FRONTEND_URL` - Frontend URL
- [ ] `NEXT_PUBLIC_API_URL` - Public API URL

## Automatic Secrets

The following secrets are automatically provided by GitHub Actions and don't need to be added:

- `GITHUB_TOKEN` - Automatically provided for GitHub Container Registry authentication

## Security Best Practices

1. **Never commit secrets to the repository**
   - All secrets should be stored in GitHub Secrets only
   - Use `.env.example` file for documentation (without real values)

2. **Use strong passwords**
   - Database passwords: Minimum 16 characters, mix of letters, numbers, symbols
   - JWT secrets: Use `openssl rand -base64 32` to generate

3. **Rotate secrets regularly**
   - Change passwords every 90 days
   - Rotate JWT secrets if compromised

4. **Limit SSH access**
   - Use SSH key authentication only (disable password auth)
   - Restrict SSH access to specific IPs if possible

5. **Monitor access**
   - Review GitHub Actions logs regularly
   - Set up alerts for failed deployments

## Testing Secrets

After adding all secrets, you can test the deployment workflow:

1. Go to **Actions** tab in GitHub
2. Click **Deploy to Production** workflow
3. Click **Run workflow** → **Run workflow**
4. Monitor the workflow execution
5. Check deployment logs for any errors

## Troubleshooting

### SSH Connection Failed

- Verify `SSH_HOST` and `SSH_PORT` are correct
- Ensure `SSH_PRIVATE_KEY` includes the full key (with `-----BEGIN` and `-----END` lines)
- Check that the public key is added to server's `~/.ssh/authorized_keys`
- Test SSH connection manually: `ssh -i ~/.ssh/deploy_key user@host`

### Deployment Path Not Found

- Verify `DEPLOY_PATH` exists on the server
- Ensure the SSH user has write permissions to `DEPLOY_PATH`
- Check that the directory contains the git repository

### Database Connection Failed

- Verify database credentials are correct
- Ensure database container is running
- Check network connectivity between containers

### Build Failed

- Check GitHub Actions logs for specific errors
- Verify Docker images can be built locally
- Ensure all required files are committed to repository

## Quick Setup Script

You can use this script to generate secrets (run locally, not on server):

```bash
#!/bin/bash
echo "=== Generating Secrets for GitHub ==="
echo ""
echo "JWT_SECRET:"
openssl rand -base64 32
echo ""
echo "DATABASE_PASSWORD:"
openssl rand -base64 24
echo ""
echo "SSH Key Generation:"
echo "Run: ssh-keygen -t ed25519 -C 'deploy@toshacity' -f ~/.ssh/deploy_key"
echo "Then add ~/.ssh/deploy_key content to SSH_PRIVATE_KEY"
echo "And add ~/.ssh/deploy_key.pub to server's authorized_keys"
```

Save this as `generate-secrets.sh`, make it executable (`chmod +x generate-secrets.sh`), and run it to generate secure values.

