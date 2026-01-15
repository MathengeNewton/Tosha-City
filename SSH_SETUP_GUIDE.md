# SSH Key Setup Guide for GitHub Actions Deployment

This guide walks you through setting up SSH keys for automated deployment from GitHub Actions to your production server.

## Overview

GitHub Actions needs an SSH key to connect to your server. You'll:
1. Generate an SSH key pair on your local machine
2. Add the **public key** to your server
3. Add the **private key** to GitHub Secrets

## Step 1: Generate SSH Key Pair

On your **local machine** (your development computer), run:

```bash
# Generate a new SSH key pair
ssh-keygen -t ed25519 -C "github-actions-deploy@toshacity" -f ~/.ssh/toshacity_deploy_key

# This creates two files:
# ~/.ssh/toshacity_deploy_key      (PRIVATE KEY - keep secret!)
# ~/.ssh/toshacity_deploy_key.pub  (PUBLIC KEY - safe to share)
```

**When prompted:**
- **Passphrase**: You can leave it empty (press Enter) for automated deployments, or set a passphrase for extra security
- **File location**: The command above uses `~/.ssh/toshacity_deploy_key` (recommended)

## Step 2: Add Public Key to Server

### Option A: Using ssh-copy-id (Easiest)

```bash
# Copy public key to server (replace user@server with your details)
ssh-copy-id -i ~/.ssh/toshacity_deploy_key.pub user@your-server-ip

# Example:
# ssh-copy-id -i ~/.ssh/toshacity_deploy_key.pub deploy@123.456.789.0
```

### Option B: Manual Copy

```bash
# 1. Display your public key
cat ~/.ssh/toshacity_deploy_key.pub

# 2. Copy the entire output (starts with ssh-ed25519 and ends with your email)

# 3. SSH into your server
ssh user@your-server-ip

# 4. On the server, add the public key to authorized_keys
mkdir -p ~/.ssh
chmod 700 ~/.ssh
echo "PASTE_YOUR_PUBLIC_KEY_HERE" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

# 5. Exit the server
exit
```

### Option C: Using Existing SSH Access

If you already have SSH access to the server:

```bash
# Copy public key to server
cat ~/.ssh/toshacity_deploy_key.pub | ssh user@your-server-ip "mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
```

## Step 3: Test SSH Connection

Test that the key works:

```bash
# Test connection using the new key
ssh -i ~/.ssh/toshacity_deploy_key user@your-server-ip

# Example:
# ssh -i ~/.ssh/toshacity_deploy_key deploy@123.456.789.0
```

If it works, you should be logged into your server without entering a password.

## Step 4: Add Private Key to GitHub Secrets

### Get Your Private Key

```bash
# Display your private key (copy the ENTIRE output)
cat ~/.ssh/toshacity_deploy_key
```

**Important**: Copy the ENTIRE output, including:
- `-----BEGIN OPENSSH PRIVATE KEY-----`
- All the key content in between
- `-----END OPENSSH PRIVATE KEY-----`

### Add to GitHub Secrets

1. Go to your GitHub repository
2. Click **Settings** (top menu)
3. Click **Secrets and variables** → **Actions** (left sidebar)
4. Click **New repository secret**
5. Fill in:
   - **Name**: `SSH_PRIVATE_KEY`
   - **Value**: Paste the ENTIRE private key content (including BEGIN/END lines)
6. Click **Add secret**

### Visual Guide

```
GitHub Repo → Settings → Secrets and variables → Actions → New repository secret

Name:  SSH_PRIVATE_KEY
Value: -----BEGIN OPENSSH PRIVATE KEY-----
       b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
       ... (entire key content) ...
       -----END OPENSSH PRIVATE KEY-----
```

## Step 5: Add Other Required Secrets

While you're in GitHub Secrets, also add:

| Secret Name | Value | Example |
|------------|-------|---------|
| `SSH_HOST` | Your server IP or hostname | `123.456.789.0` or `server.toshacity.co.ke` |
| `SSH_USER` | SSH username | `deploy` or `ubuntu` |
| `SSH_PORT` | SSH port (optional) | `22` |
| `DEPLOY_PATH` | Deployment directory | `/var/www/toshacity` |

## Step 6: Verify Setup

### Test from GitHub Actions

1. Go to your repository → **Actions** tab
2. Click **Deploy to Production** workflow
3. Click **Run workflow** → **Run workflow**
4. Watch the logs - it should connect to your server

### Common Issues

**Issue: "Permission denied (publickey)"**
- ✅ Check that public key is in server's `~/.ssh/authorized_keys`
- ✅ Verify file permissions: `chmod 600 ~/.ssh/authorized_keys`
- ✅ Ensure private key in GitHub Secrets includes BEGIN/END lines

**Issue: "Host key verification failed"**
- The server's host key needs to be added to GitHub Actions known_hosts
- Add this step to your workflow (see troubleshooting section)

**Issue: "Connection refused"**
- ✅ Check `SSH_HOST` and `SSH_PORT` are correct
- ✅ Verify server firewall allows SSH (port 22)
- ✅ Ensure SSH service is running on server

## Security Best Practices

### 1. Use Dedicated Deploy User

Create a dedicated user on the server for deployments:

```bash
# On server
sudo adduser deploy
sudo usermod -aG docker deploy  # If using Docker
sudo mkdir -p /var/www/toshacity
sudo chown deploy:deploy /var/www/toshacity
```

### 2. Restrict SSH Access

Edit `/etc/ssh/sshd_config` on server:

```bash
# Disable password authentication (key-only)
PasswordAuthentication no
PubkeyAuthentication yes

# Restrict to specific user (optional)
AllowUsers deploy

# Restart SSH
sudo systemctl restart sshd
```

### 3. Use SSH Agent (Optional)

For extra security, use SSH agent forwarding:

```bash
# Add key to SSH agent
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/toshacity_deploy_key
```

### 4. Rotate Keys Regularly

- Change SSH keys every 90 days
- Remove old keys from `authorized_keys` when rotating

## Quick Reference Commands

```bash
# Generate key
ssh-keygen -t ed25519 -C "github-actions-deploy@toshacity" -f ~/.ssh/toshacity_deploy_key

# View public key (to add to server)
cat ~/.ssh/toshacity_deploy_key.pub

# View private key (to add to GitHub Secrets)
cat ~/.ssh/toshacity_deploy_key

# Test connection
ssh -i ~/.ssh/toshacity_deploy_key user@server-ip

# Copy public key to server
ssh-copy-id -i ~/.ssh/toshacity_deploy_key.pub user@server-ip
```

## Troubleshooting

### Add Server to Known Hosts (GitHub Actions)

If you get "Host key verification failed", add this to your workflow:

```yaml
- name: Add server to known hosts
  run: |
    ssh-keyscan -H ${{ secrets.SSH_HOST }} >> ~/.ssh/known_hosts
```

Or add a step before deployment:

```yaml
- name: Setup SSH
  run: |
    mkdir -p ~/.ssh
    echo "${{ secrets.SSH_PRIVATE_KEY }}" > ~/.ssh/deploy_key
    chmod 600 ~/.ssh/deploy_key
    ssh-keyscan -H ${{ secrets.SSH_HOST }} >> ~/.ssh/known_hosts
```

### Check Server Logs

On your server, check SSH logs:

```bash
# View SSH connection attempts
sudo tail -f /var/log/auth.log

# Or on some systems
sudo journalctl -u ssh -f
```

### Verify Key Format

The private key should look like:

```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
... (many lines of base64) ...
-----END OPENSSH PRIVATE KEY-----
```

**NOT** like:
```
-----BEGIN RSA PRIVATE KEY-----
```
(That's the old format - ed25519 is preferred)

## Next Steps

After setting up SSH keys:
1. ✅ Add all GitHub Secrets (see `GITHUB_SECRETS.md`)
2. ✅ Set up your production server (see `DEPLOYMENT.md`)
3. ✅ Push to main branch to trigger deployment
4. ✅ Monitor deployment in GitHub Actions

## Summary

1. **Generate key**: `ssh-keygen -t ed25519 -C "github-actions-deploy@toshacity" -f ~/.ssh/toshacity_deploy_key`
2. **Add public key to server**: `ssh-copy-id -i ~/.ssh/toshacity_deploy_key.pub user@server`
3. **Copy private key**: `cat ~/.ssh/toshacity_deploy_key`
4. **Add to GitHub**: Settings → Secrets → New secret → Name: `SSH_PRIVATE_KEY` → Paste private key
5. **Test**: Run GitHub Actions workflow

That's it! Your deployments will now be automated. 🚀

