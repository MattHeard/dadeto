# Assign Moderation Job CORS helper

- **Challenge:** Needed to extract the CORS setup while keeping the existing initialization behavior intact.
- **Resolution:** Added a small wrapper that builds the setup function via `createSetupCors` and immediately applies it to the Express app with the provided configuration.
