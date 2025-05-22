#!/bin/bash
set -euo pipefail

if docker compose version &> /dev/null; then
  echo "✅ docker compose already available"
  exit 0
fi

echo "⬇️  Installing docker compose v2 CLI plugin locally..."

mkdir -p ~/.docker/cli-plugins
curl -SL https://github.com/docker/compose/releases/download/v2.24.5/docker-compose-linux-x86_64 \
  -o ~/.docker/cli-plugins/docker-compose
chmod +x ~/.docker/cli-plugins/docker-compose

echo "✅ docker compose installed at ~/.docker/cli-plugins/docker-compose"