#!/bin/bash

cd "$(dirname "$0")/.."

echo "[$(date)] Watcher started. Polling every 60 seconds..."

while true; do
  git fetch origin main --quiet

  LOCAL=$(git rev-parse HEAD)
  REMOTE=$(git rev-parse origin/main)

  if [ "$LOCAL" != "$REMOTE" ]; then
    echo "[$(date)] New commits detected, deploying..."
    bash scripts/deploy.sh
    echo "[$(date)] Deploy finished. Resuming watch..."
  fi

  sleep 60
done
