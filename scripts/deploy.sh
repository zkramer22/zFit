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

# Re-install plists from the repo and restart all services. We use
# setup-server.sh (which does bootout + bootstrap per service) instead
# of `launchctl kickstart` so plist content changes get picked up — a
# bare kickstart re-runs the *installed* plist, not the repo one.
bash scripts/setup-server.sh

echo "[$(date)] Deploy complete."
