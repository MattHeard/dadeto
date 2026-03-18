# Snapshot To Behaviour

## Outcome

Replace Dadeto snapshot tests with behaviour-driven unit tests so the suite states desired behaviour explicitly instead of relying on snapshot approval as the primary specification tool.

## Priority

- MoSCoW: Could have. This is valuable test-quality work, but it is not currently blocking delivery or orchestration.
- RICE: Medium impact with small slices, but lower overall reach than the architecture and operator projects.
- Cost of Delay: Low-to-medium. The debt grows mainly in areas that are actively changing.

## Current state

The first migration slices have already landed. `dadeto-2oyo` replaced the inline snapshots in `test/toys/2026-02-19/germanTokenizer.test.js` with explicit behaviour-driven assertions, and `dadeto-10lz` followed that by identifying the next snapshot-style surface and replacing a whole-output string assertion in `test/toys/2025-10-19/csvToJsonObject.test.js` with parsed field-level assertions.

- Freshness check: reviewed on 2026-03-17 and still oriented around small characterization-driven migrations rather than broad snapshot rewrites.

The project has therefore moved from “prove the idea” to “continue the migration pattern and keep improving assertion quality.” Snapshot-style assertions are already much rarer, and the current emphasis is on bounded one-file conversions plus characterization-style tests when the existing behaviour is still fuzzy.

## Constraints

Prefer small file-local migration beads over broad test rewrites. Keep runtime behaviour stable while replacing snapshots with named assertions that explain the rule being protected. Do not widen into unrelated product changes just because a snapshot currently covers many output fields at once.

When the current behaviour is not yet well understood, prefer characterization tests in the spirit of _Working Effectively with Legacy Code_: observe and pin the current externally visible behaviour first, then replace snapshot assertions with narrower behaviour statements one rule at a time. Use those characterization tests to make the legacy behaviour explicit before deciding whether a later bead should preserve it, tighten it, or intentionally change it.

## Open questions

- Which snapshot surfaces are truly redundant once behaviour-driven assertions are added, and which still deserve a smaller targeted regression check?
- Should snapshot replacement happen only in tests, or should some production code first be reshaped so behaviour is easier to assert directly?
- What is the minimal guardrail for "keep snapshots out" once the existing snapshot tests are gone?

## Candidate next actions

- Shape the next bounded one-file migration bead from the remaining whole-output or snapshot-like assertion surfaces now that `germanTokenizer` and `csvToJsonObject` are done.
- Prefer characterization-style assertions first when the legacy behaviour is not yet obvious enough to state confidently.
- When a snapshot covers messy or poorly understood legacy output, first write characterization assertions for the current behaviour, then remove the snapshot once the behaviour is described explicitly.
- Document the testing preference in repo workflow notes once at least one concrete migration lands cleanly.
- Decide whether a lint/check guard should eventually ban new snapshot assertions.

## Tentative sequence

1. Start with the smallest existing snapshot file and replace snapshots with explicit assertions.
2. If the current behaviour is ambiguous, add characterization assertions first so the test explains what the code currently does before removing the snapshot.
3. Re-run `npm test` after each migration and confirm behaviour stays stable.
4. Move from toy/localized snapshot surfaces to broader renderer or presenter tests only after the small cases establish the pattern.
5. Once the repo is snapshot-free, add the smallest guardrail that discourages new snapshot assertions from returning.
