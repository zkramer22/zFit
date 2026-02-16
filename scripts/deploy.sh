#!/bin/bash
set -e

cd "$(dirname "$0")/.."

# Load nvm so npm/node are available (launchd doesn't source shell profile)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

echo "[$(date)] Starting deploy..."

git pull origin main

npm ci --production=false
npm run build

# Restart the node app via launchctl
launchctl kickstart -k "gui/$(id -u)/com.zfit.app"

echo "[$(date)] Deploy complete."
