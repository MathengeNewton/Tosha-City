# Quick SSH Key Setup - 5 Minutes

## Step 1: Generate SSH Key (Local Machine)

Run this script on your local machine:

```bash
./setup-ssh-key.sh
```

Or manually:

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy@toshacity" -f ~/.ssh/toshacity_deploy_key
```

## Step 2: Add Public Key to Server

```bash
# Copy public key to server
ssh-copy-id -i ~/.ssh/toshacity_deploy_key.pub user@your-server-ip

# Example:
ssh-copy-id -i ~/.ssh/toshacity_deploy_key.pub deploy@123.456.789.0
```

## Step 3: Get Private Key

```bash
# Display private key (copy everything)
cat ~/.ssh/toshacity_deploy_key
```

## Step 4: Add to GitHub Secrets

1. Go to: **GitHub Repo → Settings → Secrets and variables → Actions**
2. Click **New repository secret**
3. Name: `SSH_PRIVATE_KEY`
4. Value: Paste the ENTIRE private key (including `-----BEGIN` and `-----END` lines)
5. Click **Add secret**

## Step 5: Add Other Secrets

Also add these in GitHub Secrets:

- `SSH_HOST` = your server IP (e.g., `123.456.789.0`)
- `SSH_USER` = SSH username (e.g., `deploy`)
- `SSH_PORT` = `22` (optional)
- `DEPLOY_PATH` = `/var/www/toshacity` (or your path)

## Done! 🎉

Push to main branch and GitHub Actions will deploy automatically.

For detailed instructions, see [`SSH_SETUP_GUIDE.md`](./SSH_SETUP_GUIDE.md)

