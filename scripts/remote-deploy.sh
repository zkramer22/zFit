#!/bin/bash
set -e

echo "Deploying to freshMac..."
ssh freshmac@freshmacs-macbook-pro.tail4ac32b.ts.net "cd ~/dev/zFit && bash scripts/deploy.sh"
echo "Done!"
