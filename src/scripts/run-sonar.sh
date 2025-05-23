#!/usr/bin/env bash
set -euo pipefail

if ! command -v docker &> /dev/null; then
  echo "❌ Docker is not installed or not in PATH."
  exit 1
fi

if ! docker info &> /dev/null; then
  echo "❌ Docker is installed but the daemon is not running or accessible."
  exit 1
fi

echo "✅ Docker is available and running."

# ---------------------------------------------------------------------------
# Ensure the custom SonarQube image exists (build it if missing)
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
SONAR_DOCKER_DIR="$REPO_ROOT/docker/sonar"

if [[ -z "$(docker images -q my-sonarqube:lts 2>/dev/null)" ]]; then
  echo "📦 Building custom SonarQube image (my-sonarqube:lts)…"
  docker build -t my-sonarqube:lts "$SONAR_DOCKER_DIR"
else
  echo "📦 Custom image my-sonarqube:lts already present."
fi

docker network create sonar-net 2>/dev/null || true

# Start or reuse SonarQube server container
if docker ps --filter "name=^/sonarqube-server$" --format '{{.Names}}' | grep -q "^sonarqube-server$"; then
  echo "✔️ SonarQube server already running."
else
  # Remove any stopped container with the same name to avoid the "already in use" error
  docker rm sonarqube-server 2>/dev/null || true
  docker run -d \
    --name sonarqube-server \
    --network sonar-net \
    -p 9000:9000 \
    -e SONAR_ES_BOOTSTRAP_CHECKS_DISABLE=true \
    -v sonar_data:/opt/sonarqube/data \
    my-sonarqube:lts
fi

echo "⏳ Waiting for SonarQube to become healthy..."
until curl -s http://localhost:9000/api/system/status \
         | grep -q '"status":"UP"'; do
  sleep 2
done

echo "SonarQube server started successfully."
# ---------------------------------------------------------------------------
# Run bootstrap (inside the container) the first time we need a token
# ---------------------------------------------------------------------------
if ! docker exec sonarqube-server test -f /opt/sonarqube/data/ci_token; then
  echo "⚙️  Running bootstrap inside container to create CI token…"
  docker exec sonarqube-server /opt/sonarqube/bin/bootstrap.sh
fi
# Make sure the existing SonarQube container is attached to the sonar‑net network.
docker network connect sonar-net sonarqube-server 2>/dev/null || true
echo "🔗 Using SonarQube server at sonarqube-server:9000"

echo "Running SonarScanner CLI..."

# ---------------------------------------------------------------------------
# Always run bootstrap once (idempotent) and then read the CI token
# ---------------------------------------------------------------------------
echo "🔑 Ensuring CI token exists…"
docker exec sonarqube-server /opt/sonarqube/bin/bootstrap.sh

CI_TOKEN=$(docker exec sonarqube-server cat /opt/sonarqube/data/ci_token 2>/dev/null || true)

if [ -z "$CI_TOKEN" ]; then
  echo "❌ Failed to obtain CI token after bootstrap."
  exit 1
fi

docker run --rm \
  --network sonar-net \
  -e SONAR_HOST_URL=http://sonarqube-server:9000 \
  -e SONAR_TOKEN=$CI_TOKEN \
  -v "$PWD:/usr/src" \
  -w /usr/src \
  sonarsource/sonar-scanner-cli

# ---------------------------------------------------------------------------
# Export open issues to JSON so an LLM can review them offline
# ---------------------------------------------------------------------------
REPORT_DIR="$REPO_ROOT/reports/sonar"
REPORT_FILE="$REPORT_DIR/issues-$(date +%Y%m%d%H%M%S).json"
mkdir -p "$REPORT_DIR"

# Use the CI token as a Bearer header (cleaner than basic auth)
curl -s \
  -H "Authorization: Bearer $CI_TOKEN" \
  "http://localhost:9000/api/issues/search?componentKeys=dadeto&resolved=false&ps=10000" \
  -o "$REPORT_FILE"

echo "📄 JSON issue report written to $REPORT_FILE"

# Example: add more exports if you like
# curl -s -H "Authorization: Bearer $CI_TOKEN" \
#   "http://sonarqube-server:9000/api/qualitygates/project_status?projectKey=dadeto" \
#   -o "$REPORT_DIR/quality-gate.json"

echo "SonarScanner CLI run completed."