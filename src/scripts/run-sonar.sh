#!/bin/bash
if ! command -v docker &> /dev/null; then
  echo "❌ Docker is not installed or not in PATH."
  exit 1
fi

if ! docker info &> /dev/null; then
  echo "❌ Docker is installed but the daemon is not running or accessible."
  exit 1
fi

echo "✅ Docker is available and running."

# Start SonarQube server (named so we can reference it)
docker run -d \
  --rm \
  --name sonarqube-server \
  -p 9000:9000 \
  sonarqube

echo "SonarQube server is starting on http://localhost:9000"

echo "Waiting for SonarQube to start..."
until curl -s http://localhost:9000 > /dev/null; do sleep 2; done

echo "SonarQube server started successfully."

echo "Running SonarScanner CLI..."

docker run --rm \
  --name sonar-scanner \
  --network host \
  -v "$PWD:/usr/src" \
  -w /usr/src \
  sonarsource/sonar-scanner-cli

echo "SonarScanner CLI run completed."