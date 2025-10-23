# Inline mark-variant-dirty CORS config

- Challenge: Needed to remove the local cors-config module without breaking origin checks for the cloud function.
- Resolution: Imported `getAllowedOrigins` directly in `index.js` so the origin list still derives from environment variables after inlining the config.
