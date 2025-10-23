# Inline get-moderation-variant CORS config

- **Challenge:** Avoid duplicating origin logic when dropping the local `cors-config.js` module.
- **Resolution:** Import `getAllowedOrigins` directly from the shared helper and compute the allowed origins in `index.js`, keeping the `process.env` behavior intact.
