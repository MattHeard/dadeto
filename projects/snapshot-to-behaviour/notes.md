# Snapshot To Behaviour

## Outcome

Replace Dadeto snapshot tests with behaviour-driven unit tests so the suite states desired behaviour explicitly instead of relying on snapshot approval as the primary specification tool.

## Current state

The repo still contains snapshot-style assertions, including inline snapshots in `test/toys/2026-02-19/germanTokenizer.test.js`. Those checks are useful as broad regression alarms, but they are weak at communicating intent and often make it too easy to accept output churn without clarifying the expected behaviour. This project is about migrating each snapshot surface toward explicit assertions over inputs, outputs, and observable rules.

## Constraints

Prefer small file-local migration beads over broad test rewrites. Keep runtime behaviour stable while replacing snapshots with named assertions that explain the rule being protected. Do not widen into unrelated product changes just because a snapshot currently covers many output fields at once.

When the current behaviour is not yet well understood, prefer characterization tests in the spirit of _Working Effectively with Legacy Code_: observe and pin the current externally visible behaviour first, then replace snapshot assertions with narrower behaviour statements one rule at a time. Use those characterization tests to make the legacy behaviour explicit before deciding whether a later bead should preserve it, tighten it, or intentionally change it.

## Open questions

- Which snapshot surfaces are truly redundant once behaviour-driven assertions are added, and which still deserve a smaller targeted regression check?
- Should snapshot replacement happen only in tests, or should some production code first be reshaped so behaviour is easier to assert directly?
- What is the minimal guardrail for "keep snapshots out" once the existing snapshot tests are gone?

## Candidate next actions

- Replace the inline snapshots in `test/toys/2026-02-19/germanTokenizer.test.js` with explicit string assertions that state the normalization rules directly.
- Inventory any remaining `toMatchSnapshot` and `toMatchInlineSnapshot` uses and turn the smallest one into the next bounded bead.
- When a snapshot covers messy or poorly understood legacy output, first write characterization assertions for the current behaviour, then remove the snapshot once the behaviour is described explicitly.
- Document the testing preference in repo workflow notes once at least one concrete migration lands cleanly.
- Decide whether a lint/check guard should eventually ban new snapshot assertions.

## Tentative sequence

1. Start with the smallest existing snapshot file and replace snapshots with explicit assertions.
2. If the current behaviour is ambiguous, add characterization assertions first so the test explains what the code currently does before removing the snapshot.
3. Re-run `npm test` after each migration and confirm behaviour stays stable.
4. Move from toy/localized snapshot surfaces to broader renderer or presenter tests only after the small cases establish the pattern.
5. Once the repo is snapshot-free, add the smallest guardrail that discourages new snapshot assertions from returning.
