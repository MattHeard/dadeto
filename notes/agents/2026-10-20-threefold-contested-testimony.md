# THREEFOLD contested testimony

## Unexpected hurdle

Adding authored testimony to the Broken Gate episode changed several legacy tests that compared the whole outcome object. The save codec also rejected schema v5 after its current version advanced to v6 because the accepted-version list was explicit.

## Diagnosis and fix

Testimony is authored episode data, separate from the factual witness-event ledger and player-intention entries. The renderer exposes the two attributed accounts and their cited statements in a text-only panel. Save normalization rebuilds these authored records instead of accepting edited save text, leaving warning-relay responsibility unresolved. Broken Gate now writes schema v6 and reads schema v1 through v6; the Tidal Archive keeps its isolated schema-v4 state.

## Next-time guidance

When adding authored data to a shared simulation state, check scene-specific save isolation and every exact-version allowlist. Use `npm run test:impact -- --files ...` for the focused changed-test run before the repository fast gate. Keep testimony attribution separate from event facts and player intention, and do not infer responsibility from conflicting statements.
