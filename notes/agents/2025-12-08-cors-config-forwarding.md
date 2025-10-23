# CORS config forwarding cleanup

## Challenges
- Needed to ensure every Cloud Function wrapper stopped re-exporting `allowedOrigins` while keeping the modules readable and consistent with existing style conventions.

## Resolutions
- Updated each `cors-config.js` shim to import only the shared default export and confirmed a blank line separates the import from the export so the files stay uniform across directories.
