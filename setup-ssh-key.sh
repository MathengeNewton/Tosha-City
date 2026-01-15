#!/bin/bash

# ToshaCity Butchery - SSH Key Setup Script
# This script helps you generate and set up SSH keys for GitHub Actions deployment

set -e

echo "🔐 ToshaCity Butchery - SSH Key Setup"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
KEY_NAME="toshacity_deploy_key"
KEY_PATH="$HOME/.ssh/$KEY_NAME"
# TEMPORARY: Default server values (remove after setup)
DEFAULT_SERVER_USER="root"
DEFAULT_SERVER_IP="209.38.43.31"
DEFAULT_SERVER="${DEFAULT_SERVER_USER}@${DEFAULT_SERVER_IP}"

# Check if key already exists
if [ -f "$KEY_PATH" ]; then
    echo -e "${YELLOW}⚠️  SSH key already exists at: $KEY_PATH${NC}"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 1
    fi
    rm -f "$KEY_PATH" "$KEY_PATH.pub"
fi

# Generate SSH key
echo -e "${BLUE}📝 Generating SSH key pair...${NC}"
ssh-keygen -t ed25519 -C "github-actions-deploy@toshacity" -f "$KEY_PATH" -N ""

echo ""
echo -e "${GREEN}✅ SSH key generated successfully!${NC}"
echo ""

# Display public key
echo -e "${BLUE}📋 Your PUBLIC key (add this to your server):${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cat "$KEY_PATH.pub"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Ask if user wants to copy to server
read -p "Do you want to copy the public key to your server now? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "Enter server address (user@hostname or user@ip) [default: $DEFAULT_SERVER]: " SERVER_ADDRESS
    
    if [ -z "$SERVER_ADDRESS" ]; then
        SERVER_ADDRESS="$DEFAULT_SERVER"
        echo -e "${BLUE}Using default: $SERVER_ADDRESS${NC}"
    fi
    
    echo -e "${BLUE}📤 Copying public key to server ($SERVER_ADDRESS)...${NC}"
    ssh-copy-id -i "$KEY_PATH.pub" "$SERVER_ADDRESS" || {
        echo -e "${YELLOW}⚠️  ssh-copy-id failed. You can manually add the public key above to:${NC}"
        echo "   ~/.ssh/authorized_keys on your server"
    }
fi

echo ""
echo -e "${BLUE}📋 Your PRIVATE key (add this to GitHub Secrets):${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cat "$KEY_PATH"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo -e "${YELLOW}⚠️  IMPORTANT: Keep your private key secret!${NC}"
echo ""
echo -e "${GREEN}📝 Next steps:${NC}"
echo "1. Copy the PRIVATE key above (including BEGIN/END lines)"
echo "2. Go to GitHub → Your Repo → Settings → Secrets and variables → Actions"
echo "3. Click 'New repository secret'"
echo "4. Name: SSH_PRIVATE_KEY"
echo "5. Value: Paste the entire private key"
echo "6. Click 'Add secret'"
echo ""
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "Key files saved at:"
echo "  Private: $KEY_PATH"
echo "  Public:  $KEY_PATH.pub"

