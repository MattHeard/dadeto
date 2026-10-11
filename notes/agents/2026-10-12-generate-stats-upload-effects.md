# Generate-stats upload effect boundary

- Unexpected hurdle: the simulator and a cloud-wrapper test still assumed the
  core received a Storage client after the production upload was moved out.
- Diagnosis: the core was called both by the HTTP handler and directly by the
  local simulator; TSDoc and focused tests identified both paths.
- Fix: `generate(permission)` now calls an injected `saveStatsHtml` function.
  The cloud wrapper binds the production Storage client in
  `storage-effect-adapter.js`; the simulator binds its fake Storage through the
  same token-bearing interface. Bucket and object-prefix resolution remain in
  core, and the adapter preserves HTML content type and no-cache metadata.
- Evidence: focused generate-stats/simulator suites passed (5 suites, 82
  tests); `npm run tsdoc:check` and targeted ESLint passed; elevated
  `npm run check` passed all 10 gates with 0 clones and 0 audit vulnerabilities;
  `npm run build` passed.
- Next-time guidance: continue the rank-1 Allow Effects backlog audit at the
  next lexicographic `src/cloud` entrypoint, checking both direct command calls
  and dependencies injected into core.
