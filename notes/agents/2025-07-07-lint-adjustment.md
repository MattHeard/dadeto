# Lint Adjustment

- Encountered ESLint complexity warning in `src/core/cloud/get-moderation-variant/cors.js` when running the project lint task.
- Resolved by extracting a helper function to isolate the array check and returning early for missing origins, keeping cyclomatic complexity within the configured threshold.
