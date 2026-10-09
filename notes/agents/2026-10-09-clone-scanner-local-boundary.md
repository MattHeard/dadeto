# Clone scanner local boundary

- **Unexpected hurdle:** Relocating the clone scanner into `src/core/local` exposed its dependency on `src/core/build/html.js`, which violates the core-local sibling boundary.
- **Diagnosis:** `npm run depcruise` reported `core-local-no-core-sibling-deps` for the scanner's HTML escaping import.
- **Fix:** Kept the local scanner core isolated by injecting the existing `escapeHtml` helper from `src/local/run-clone-scanner.js`. Moved the executable and scanner tests into their local directories, updated the duplication gate target, and preserved the check's output behavior.
- **Evidence:** Focused scanner and gate suites passed 22/22; `npm run duplication` reports zero clones; `npm run non-core-thin` passed for 251 files; `npm run depcruise` passed (759 modules, 1,327 dependencies); final `JEST_CACHE_DIRECTORY=/home/matt/dadeto/.jest-cache TMPDIR=/home/matt/dadeto/.tmp DADETO_COVERAGE_SHARD_SIZE=40 npm run check` emitted `check-summary status=passed`, 10/10 evaluators. The scanner report remains at `reports/duplication/jscpd-report.json`.
- **Next-time guidance:** Keep Node filesystem, crypto, package, and permission wiring in `src/local`. Inject utilities from other core areas when `src/core/local` needs them, rather than importing across sibling core directories.
