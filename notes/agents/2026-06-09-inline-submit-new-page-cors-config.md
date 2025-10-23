# Inline submit new page CORS config

- **Challenge:** Removing the local `cors-config.js` wrapper risked missing environment-derived origins that the endpoint expected.
- **Resolution:** Reused the shared `getAllowedOrigins(process.env)` helper directly in `index.js` and deleted the redundant wrapper so the allowed origin list remains identical.
