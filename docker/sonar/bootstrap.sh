#!/usr/bin/env bash
set -euo pipefail

# Wait until the web server reports UP (endpoint does not require authentication)
echo "⏳ Waiting for SonarQube to become healthy..."
until curl -s http://localhost:9000/api/system/status | grep -q '"status":"UP"'; do
  sleep 2
done

# If a CI token file already exists, revoke and refresh it
if [ -s /opt/sonarqube/data/ci_token ]; then
  OLD_TOKEN=$(cat /opt/sonarqube/data/ci_token)
  echo "🔄 CI token exists – revoking and generating a new one..."
  # Revoke by token value (ignores failure if token already invalid)
  curl -s -u admin:changeit -X POST \
       -d "token=$OLD_TOKEN" \
       http://localhost:9000/api/user_tokens/revoke >/dev/null || true
  rm -f /opt/sonarqube/data/ci_token
fi

# 1. Change the default admin password (SonarQube 9.x requires previousPassword)
curl -s -u admin:admin -X POST \
     -d 'login=admin&previousPassword=admin&password=changeit' \
     http://localhost:9000/api/users/change_password

# 2. Create (or recreate) token for CI
# Revoke any existing token with the same name; ignore errors if it doesn't exist
curl -s -u admin:changeit -X POST \
     -d 'login=admin&name=ci-token' \
     http://localhost:9000/api/user_tokens/revoke >/dev/null || true

RAW=$(curl -s -u admin:changeit -X POST \
           -d 'name=ci-token' \
           http://localhost:9000/api/user_tokens/generate)

TOKEN=$(echo "$RAW" | sed -n -E 's/.*"token":"([^"]+)".*/\1/p')

if [ -z "$TOKEN" ]; then
  echo "❌ Failed to generate CI token – aborting bootstrap."
  exit 1
fi

echo "Generated CI token: $TOKEN"

# persist it where the host can read it
echo "$TOKEN" > /opt/sonarqube/data/ci_token
chown sonarqube:sonarqube /opt/sonarqube/data/ci_token

# 3. (optional) Create a default project
curl -s -u admin:changeit -X POST \
     -d 'name=dadeto&project=dadeto' \
     http://localhost:9000/api/projects/create \
  | grep -vq '"errors"' || echo "ℹ️  Project already exists."

# 4. (optional) Attach a quality gate, profile, etc.
# See /api/webservices/list for full endpoints.

echo "✅ Bootstrap complete – token ready"