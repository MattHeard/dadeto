# THREEFOLD contested testimony

## Unexpected hurdle

Adding authored testimony to the Broken Gate episode changed several legacy tests that compared the whole outcome object. The save codec also rejected schema v5 after its current version advanced to v6 because the accepted-version list was explicit.

## Diagnosis and fix

Testimony is authored episode data, separate from the factual witness-event ledger and player-intention entries. The renderer exposes the two attributed accounts and their cited statements in a text-only panel. Save normalization rebuilds these authored records instead of accepting edited save text, leaving warning-relay responsibility unresolved. Broken Gate now writes schema v6 and reads schema v1 through v6; the Tidal Archive keeps its isolated schema-v4 state.

## Next-time guidance

When adding authored data to a shared simulation state, check scene-specific save isolation and every exact-version allowlist. Use `npm run test:impact -- --files ...` for the focused changed-test run before the repository fast gate. Keep testimony attribution separate from event facts and player intention, and do not infer responsibility from conflicting statements.

## Exact-head coverage follow-up

- **Unexpected hurdle:** Full Check run [39412050682](https://github.com/MattHeard/dadeto/actions/runs/39412050682) passed all 49 coverage shards but failed the global branch threshold at 99.98%.
- **Diagnosis:** its coverage artifact [12259339156](https://github.com/MattHeard/dadeto/actions/runs/39412050682/artifacts/12259339156) identified the omitted-options default, nullish testimony-option fallback, and optional responsibility-node path as the only uncovered branch arms.
- **Fix:** added regressions for omitted constructor options, null normalization options, and a testimony list without the optional responsibility element.
- **Evidence:** focused impact tests passed (2 suites / 42 tests); `npm run test:unit` passed 970 suites / 6,785 tests across 49/49 shards with 100% statements, branches, functions, and lines globally and for both changed source modules; `npm run check` passed all 10 fast gates.
- **Next-time guidance:** inspect the exact-head coverage artifact before closing a feature even when every test shard passed; default arguments and optional DOM elements can still leave uncovered branch arms.
