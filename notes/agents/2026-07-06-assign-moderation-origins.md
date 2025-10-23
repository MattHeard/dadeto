# Assign moderation origins extraction

- **Challenge:** Moving the origin helpers into the shared core module without breaking the CORS factory wiring required double-checking the existing dependency exports.
- **Resolution:** Added the helpers to the core module, updated the Cloud Function entrypoint to import them, and ran `npm test` to confirm the shared factories still receive the expected callbacks.
