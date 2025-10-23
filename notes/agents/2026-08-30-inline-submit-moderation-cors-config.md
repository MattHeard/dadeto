# Inline submit moderation rating cors config

- **Challenge:** Needed to remove the thin wrapper without breaking the environment-dependent origin resolution used by the Cloud Function.
- **Resolution:** Imported `getAllowedOrigins` directly in the entrypoint and computed the allowed origins from `process.env`, allowing the wrapper module to be deleted safely.
