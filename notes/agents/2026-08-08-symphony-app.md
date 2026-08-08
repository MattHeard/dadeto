# Remaining Symphony TSDoc cleanup

- Unexpected hurdle: the local Symphony app mixed generic Express callback signatures with structured status and launcher contracts, causing function-variance and optional-state diagnostics rather than simple missing annotations.
- Diagnosis path: introduced explicit handler, app, status-store, route-factory, and status-shape typedefs; then narrowed optional active-run state and the refresh snapshot at use sites.
- Chosen fix: structural JSDoc contracts and local narrowing only; no runtime behavior changes.
- Evidence: `src/core/local/symphony/app.js` and `launcherCodex.js` now contribute zero TSDoc diagnostics; targeted ESLint passes; launcher tests pass 4 tests. The app test is blocked before execution by Jest's existing `import.meta`/ESM transform issue.
