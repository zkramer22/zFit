#!/bin/bash
set -e

cd "$(dirname "$0")/.."

REPO_DIR="$(pwd)"
HOME_DIR="$HOME"
NODE_PATH="$(which node)"

if [ -z "$NODE_PATH" ]; then
  echo "Error: node not found in PATH. Make sure Node.js is installed."
  exit 1
fi

echo "Setting up zFit launchd services..."
echo "  Home:    $HOME_DIR"
echo "  Node:    $NODE_PATH"
echo "  Repo:    $REPO_DIR"
echo ""

DEST="$HOME_DIR/Library/LaunchAgents"
mkdir -p "$DEST"

PLISTS=(
  com.zfit.pocketbase
  com.zfit.app
  com.zfit.https
  com.zfit.watcher
)

# Unload existing services (ignore errors if not loaded)
for name in "${PLISTS[@]}"; do
  launchctl bootout "gui/$(id -u)/$name" 2>/dev/null || true
done

# Copy plists with placeholder replacement
for name in "${PLISTS[@]}"; do
  sed -e "s|__HOME__|$HOME_DIR|g" \
      -e "s|__NODE__|$NODE_PATH|g" \
      "scripts/launchd/$name.plist" > "$DEST/$name.plist"
  echo "Installed $name.plist"
done

# Load all services
for name in "${PLISTS[@]}"; do
  launchctl bootstrap "gui/$(id -u)" "$DEST/$name.plist"
  echo "Loaded $name"
done

echo ""
echo "All services started. Check status with:"
echo "  launchctl list | grep zfit"
echo ""
echo "View logs:"
echo "  tail -f ~/Library/Logs/zfit-app.log"
echo "  tail -f ~/Library/Logs/zfit-pocketbase.log"
echo "  tail -f ~/Library/Logs/zfit-https.log"
echo "  tail -f ~/Library/Logs/zfit-watcher.log"
