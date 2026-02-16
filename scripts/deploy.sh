#!/bin/bash
set -e

cd "$(dirname "$0")/.."

echo "[$(date)] Starting deploy..."

git pull origin main

npm ci --production=false
npm run build

# Restart the node app via launchctl
launchctl kickstart -k "gui/$(id -u)/com.zfit.app"

echo "[$(date)] Deploy complete."
