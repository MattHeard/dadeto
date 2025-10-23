# Report for Moderation CORS bridge

## Challenges
- Needed to expose the shared CORS configuration to the report-for-moderation module without relying on a parent-relative import.

## Resolutions
- Added a local re-export that forwards to the shared `src/cloud/cors-config.js` module and updated the handler entry point to consume the new local module so future refactors remain encapsulated.
