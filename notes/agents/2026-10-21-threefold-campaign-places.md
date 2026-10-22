# THREEFOLD saved-region campaign index

## Unexpected hurdle

Each playable region has its own versioned save key, and the runtime previously loaded a second region only for Belltops' ferry continuity. There was no overview of which regions had current or saved runs.

## Diagnosis and fix

Use the existing save codec to validate each region independently. The runtime now derives a read-only authored-order index from validated saves plus its active scene; it exposes the same result in the WebMCP snapshot and an accessible disclosure. The index includes region names only, so it does not reveal undiscovered outcomes or merge route state.

## Evidence

Focused impact passed 11 related suites / 98 tests with 100% statement and branch coverage for every changed core file; ESLint and core-parse passed, and duplication reported zero clones. `DADETO_CHECK_PROGRESS_INTERVAL_MS=3000 npm run check` passed all 10 fast local gates across five serial all-unit shards (984 suites), with zero clones and zero audit vulnerabilities. `npm run build`, `npm run manuals:check` (79 manuals), `npm run tsdoc:check`, and `git diff --check` passed. Exact-head CI is pending after push. The shared Dolt lock also prevented Beads reads and sync; it was not altered.

## Next-time guidance

Keep region saves as the source of truth. Add cross-region outcomes as explicit projections with player-knowledge checks rather than copying route data into a second mutable save. Continue the Rank 3 regulator/Iri fate work after recording its loop contract when Beads access returns.
