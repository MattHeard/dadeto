#!/usr/bin/env bash
set -euo pipefail

NVM_DIR="${NVM_DIR:-$HOME/.nvm}"

if [[ ! -s "$NVM_DIR/nvm.sh" ]]; then
  echo "Installing nvm..."
  curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.6/install.sh | bash
fi

# Load nvm for this script's shell.
export NVM_DIR
# shellcheck disable=SC1090
source "$NVM_DIR/nvm.sh"

echo "Installing the latest Node.js LTS..."
nvm install --lts
nvm alias default 'lts/*'
nvm use --lts

echo "Updating npm..."
npm install --global npm@latest

echo
echo "Upgrade complete:"
node --version
npm --version
