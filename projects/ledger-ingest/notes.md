# Ledger Ingest

## Outcome

Build a Dadeto toy that imports raw bank and card transaction exports into one canonical ledger through a pure-function core that is exposed through a thin end-to-end toy flow, so each iteration is deployable and can be validated with real user feedback.

## Priority

- MoSCoW: Could have. This is real product-building work, but it is less urgent than the repo-health and operator-trust projects.
- RICE: Medium impact and moderate effort because it can prove a useful Dadeto pattern, but its reach is narrower than the shared infrastructure work.
- Cost of Delay: Low-to-medium. The main cost is delayed product value rather than compounding repo-wide debt.

## Current state

This project now has a first real implementation slice rather than only a PRD, but the current shape is still too internal: the pure core exists and core-focused fixtures have landed, yet there is still no thin end-to-end toy surface that a user can actually try. That makes the project easy to overfit to internal contracts and harder to validate through real user feedback.

The intended core remains a deterministic JSON-in / JSON-out import function that performs mapping, normalization, validation, deduplication, and summary generation without direct filesystem, database, network, or implicit clock dependencies. However, that core should live inside the toy structure like the repo's other toys, and each meaningful iteration should move the toy toward a user-testable end-to-end flow rather than stopping at inaccessible internal seams.

- Freshness check: reviewed on 2026-03-17 and still aligned with the thin-wrapper / user-testable flow goal.

## Constraints

Keep the pure-function core explicit and free of hidden file IO, persistence, or network calls, but do not let the project stall as a core-only library. Prefer stable JSON schemas, explicit policy inputs, and fixture-driven unit tests, while ensuring each iteration still moves toward a thin user-testable toy wrapper that can be validated end to end. The MVP should solve statement import cleanly before expanding into categorization, forecasting, dashboards, or bank sync.

## Open questions

- Should `transactionId` be a content-derived hash or assigned by an adapter?
- Should normalized output preserve `rawRow` or `sourceRowIndex` in the MVP?
- Which minimum canonical fields are mandatory across all supported institutions?
- Should sign normalization live in field mapping, normalization policy, or both?
- How strict should duplicate detection be before configurable tolerances are introduced?

## Candidate next actions

- Move the ledger-ingest core into a toy subdir so its structure matches the repo's other toys and the import surface is easier to discover.
- Add the thinnest possible end-to-end toy wrapper that lets a user supply sample data, run the core, and inspect canonical rows, duplicates, and errors.
- Continue adding narrow fixtures for structured error reporting or institution mapping edge cases, but only in support of the user-testable toy flow.
- Define the first canonical transaction schema and structured error format in code-level tests where that contract is still implicit.
- Decide which open question most threatens MVP correctness and shape a bead around it only if it blocks the first core slice.

## Tentative sequence

1. Keep the core pure, but place it inside the toy structure so the repo shape matches other toys.
2. Add the thinnest end-to-end toy flow that a user can actually run and comment on.
3. Prove normalization, deduplication, and structured errors through that toy plus fixture-backed tests.
4. Add a second source or edge case only after the first end-to-end import path is stable and understandable.
5. Tighten the schema and duplicate policy gradually as real user feedback accumulates.

## MVP shape

Core function:

```ts
importTransactions(input: ImportTransactionsInput): ImportTransactionsOutput
```

The pure core should:

- accept only JSON-compatible input
- return only JSON-compatible output
- perform no direct file IO
- perform no direct database writes
- perform no network calls
- depend on explicit inputs rather than ambient current time

## Product principles

- Deterministic: the same input should produce the same output
- Local-first: raw financial data stays under user control
- Composable: core logic stays isolated from adapters
- Auditable: every transformation should be explainable
- Narrow: solve import cleanly before expanding scope
- Feedbackable: each meaningful version should be runnable as a toy that a user can validate end to end
