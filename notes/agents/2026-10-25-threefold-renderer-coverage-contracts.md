# Threefold renderer coverage contracts

- Hurdle: Full Check 40176886902 on 02535c1 passed every test shard but failed global branches at 99.676% with 69 missed arms; 11 were in the renderer.
- Diagnosis: run every Threefold suite with renderer-only coverage. The old renderer reached 98.66% branches and exposed unreachable defaults for generated rectangle dimensions, fixed caption fonts, badge connectors/placement, and a watchkeeper color bypassed by person dispatch. Two reachable paths omit a badge when a resident is offscreen.
- Fix: encode generated rectangular-pixel contracts; consume the caption font supplied by every text producer; use the guaranteed positive connector gap and horizontal badge slot; remove the unreachable geometry watchkeeper color. Keep offscreen badge omission and verify it through the public scene renderer. Strengthen caption tests to require an immediately preceding opaque backing in eight scene families.
- Focused evidence: 45 Threefold suites / 724 tests passed with 100% statements, branches, functions, and lines for renderer.js. Report: /tmp/threefold-complete-resume/coverage-final.json. No coverage threshold, source exclusion, or ignore annotation changed.
- Guidance: inspect caller geometry and authored scene limits before retaining defensive branches; use public render scenarios for reachable boundary behavior. Global Full Check remains separate and must be observed after push.

- Local gates: DADETO_CHECK_PROGRESS_INTERVAL_MS=3000 npm run check passed all 10 gates across six unit shards with zero clones; npm run build passed (log /tmp/dadeto-renderer-resume-build.log), focused ESLint and strict JSDoc passed. Keep the aggregate coverage Bead open until authoritative Full Check succeeds.
- Runner lesson: running direct Stryker concurrently with the unit gate caused harmless Jest Haste package-name warnings from its generated sandbox. Use the isolated mutation worktree runner or run them sequentially next time.
