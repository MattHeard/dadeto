#!/bin/bash

# Test && Commit || Revert (TCR) script
# Usage: ./tcr.sh [commit message]
# See: https://medium.com/@kentbeck_7670/test-commit-revert-870bbd756864

# Default commit message if not provided
COMMIT_MESSAGE=${1:-"refactor"}

echo "Running tests..."
npm test
TEST_EXIT_CODE=$?

echo "Running ESLint..."
npm run lint
LINT_EXIT_CODE=$?

echo "Running Sonar..."
npm run sonar
SONAR_EXIT_CODE=$?

# Check if both tests and lint passed
if [ $TEST_EXIT_CODE -eq 0 ] && [ $LINT_EXIT_CODE -eq 0 ] && [ $SONAR_EXIT_CODE -eq 0 ]; then
  echo "Tests and linting passed! Committing changes..."
  git add .
  git commit -m "$COMMIT_MESSAGE"
  echo "Changes committed successfully with message: '$COMMIT_MESSAGE'"
else
  if [ $TEST_EXIT_CODE -ne 0 ]; then
    echo "Tests failed!"
  fi

  if [ $LINT_EXIT_CODE -ne 0 ]; then
    echo "Linting failed!"
  fi

  echo "Reverting changes..."
  git reset --hard
  echo "Changes have been reverted."
fi
