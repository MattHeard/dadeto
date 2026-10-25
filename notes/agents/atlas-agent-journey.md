# Atlas local agent journey

## Hurdle

The deterministic journey and atomic file adapter had been added under
`src/local/interpretability/`. Their size and direct platform logic violated
the repository's thin-wrapper rule, so the first local full check failed the
`non-core-thin` and lint gates.

## Diagnosis and fix

Moved orchestration and atomic storage into `src/core/local/interpretability/`
as injectable factories. Local wrappers now supply the filesystem, path,
cryptographic digest, random IDs, clock, lock timer, and allow-effects boundary.
The runtime executable supplies real Zod schemas; Jest uses the existing test
schema factory and does not import or require the Zod package. The journey
preserves candidate discovery, complete bounded snapshots, evidence-sensitive
planning, and concurrent-safe V7 submission.

## Evidence

- `node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand --coverage=false test/core/interpretability/evidenceReuseRoundTrip.test.js`: passed (1 suite / 1 test). The experimental VM flag is required for this ESM project's direct Jest invocation.
- Targeted ESLint: passed for the six journey, storage, CLI, and regression-test files.
- `npm run non-core-thin`: passed (378 non-core JS files; 2 existing exemptions; 50-line limit).
- `npm run build`: passed.
- `DADETO_CHECK_PROGRESS_INTERVAL_MS=3000 npm run check`: passed all 10 gates; six impact shards passed (1,047 suites / 7,677 tests), audit reported 0 vulnerabilities, and duplication found 0 clones.
- `git diff --check`: passed. Exact-head GitHub Full Check remains pending until after this change is pushed.

## Next-time guidance

Keep platform calls at the local wrapper edge and group related dependencies
into explicit filesystem, lock, and identity adapters. Record loop contracts in
Beads before editing. Verify local `npm run check` separately from exact-head
GitHub Full Check.
