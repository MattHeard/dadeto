# CORS origin callback extraction

## Summary
- Lifted the inline CORS origin callback into a named helper for readability and easier reuse.

## Challenges & Resolutions
- Preserved the existing closure over `allowedOrigins` by keeping the helper within the module scope instead of parameterizing it further.
