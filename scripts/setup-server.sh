#!/bin/bash
set -e

# Installs zFit's services as launchd daemons, so they start at boot without
# anyone logging in. Run it as the user who owns ~/zfit (not with sudo); it
# asks for sudo itself. Expects ~/zfit to be a clone of the deploy branch with
# the pocketbase binary and pb_data in it.

cd "$(dirname "$0")"

for name in com.zfit.pocketbase com.zfit.deploy; do
  # Remove the per-login agent version if it's still installed
  launchctl bootout "gui/$(id -u)/$name" 2>/dev/null || true
  rm -f "$HOME/Library/LaunchAgents/$name.plist"

  dest="/Library/LaunchDaemons/$name.plist"
  sudo launchctl bootout "system/$name" 2>/dev/null || true
  sed -e "s|__HOME__|$HOME|g" -e "s|__USER__|$(id -un)|g" "launchd/$name.plist" \
    | sudo tee "$dest" > /dev/null
  sudo chown root:wheel "$dest"
  sudo chmod 644 "$dest"
  sudo launchctl bootstrap system "$dest"
  echo "Loaded $name"
done

echo ""
echo "Logs:"
echo "  tail -f ~/Library/Logs/zfit-pocketbase.log"
echo "  tail -f ~/Library/Logs/zfit-deploy.log"
