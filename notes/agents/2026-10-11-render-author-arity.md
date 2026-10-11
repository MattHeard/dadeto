# Render author arity loop

- Unexpected hurdle: The full quality check takes several minutes and can exhaust the shared 2 GB `/tmp` filesystem through Jest's Rust cache.
- Diagnosis: The check completed normally when its temp directory was placed under the repository; `/tmp` stayed at 2% usage.
- Chosen fix: Read each dependency directly from the named `deps` record in `runRenderAuthor`, preserving the existing trigger wiring and effect boundary.
- Evidence: Focused render-author test and `npm run tsdoc:check` passed. `TMPDIR=/home/matt/dadeto/.tmp npm run check` passed all 10 gates, including 11 E2E tests, 100% line/statement/function/branch coverage, zero clones, and zero audit vulnerabilities.
- Next-time guidance: Keep `TMPDIR` in the workspace for full checks. The refreshed cloud-only lint inventory has seven candidates; `generate-stats/generate-stats-core.js` is next.
