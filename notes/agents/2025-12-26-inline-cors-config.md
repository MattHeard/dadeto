# Inline assign moderation job CORS config

- **Challenge:** Removing the shared `cors-config` helper file risked missing options that callers depend on.
- **Resolution:** Reviewed `src/cloud/cors-config.js` to confirm only `allowedOrigins` was exported and recreated the same options inline in `index.js` so the origin handler still receives the environment-derived list.
