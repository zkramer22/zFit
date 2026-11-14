#!/bin/bash
set -e

# Installs zFit's launchd services on the server. Expects ~/zfit to be a
# clone of the deploy branch with the pocketbase binary and pb_data in it.

cd "$(dirname "$0")"

DEST="$HOME/Library/LaunchAgents"
mkdir -p "$DEST"

for name in com.zfit.pocketbase com.zfit.deploy; do
  launchctl bootout "gui/$(id -u)/$name" 2>/dev/null || true
  sed -e "s|__HOME__|$HOME|g" "launchd/$name.plist" > "$DEST/$name.plist"
  launchctl bootstrap "gui/$(id -u)" "$DEST/$name.plist"
  echo "Loaded $name"
done

echo ""
echo "Logs:"
echo "  tail -f ~/Library/Logs/zfit-pocketbase.log"
echo "  tail -f ~/Library/Logs/zfit-deploy.log"
