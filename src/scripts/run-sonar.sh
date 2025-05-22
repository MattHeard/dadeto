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

cd docker/sonar