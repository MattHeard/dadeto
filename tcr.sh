#!/bin/bash

# Test && Commit || Revert (TCR) script
# Usage: ./tcr.sh [commit message]

# Default commit message if not provided
COMMIT_MESSAGE=${1:-"refactor"}

echo "Running tests..."
npm test
TEST_EXIT_CODE=$?

echo "Running ESLint..."
npm run lint
LINT_EXIT_CODE=$?

# Check if both tests and lint passed
if [ $TEST_EXIT_CODE -eq 0 ] && [ $LINT_EXIT_CODE -eq 0 ]; then
  echo "Tests passed! Committing changes..."
  git add .
  git commit -m "$COMMIT_MESSAGE"
  echo "Changes committed successfully with message: '$COMMIT_MESSAGE'"
else
  echo "Tests failed! Reverting changes..."
  git reset --hard
  echo "Changes have been reverted."
fi
