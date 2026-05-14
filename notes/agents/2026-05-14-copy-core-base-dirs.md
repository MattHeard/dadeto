# Copy Core Base Directory Inputs

- Bead: dadeto-cjg1
- Change: `createCopyCore` now accepts `projectRoot`, `srcDir`, and `publicDir` instead of a composed directory map.
- Core behavior: `createCopyCore` calls `createStaticSiteCopyDirectories` internally using the injected path adapter.
- Adapter impact: `src/build/copy.js` no longer imports or calls `createStaticSiteCopyDirectories`.
- Evidence: focused copy test passed; full `npm run check` passed after network escalation for `npm audit`.
- Audit: 0 vulnerabilities.
