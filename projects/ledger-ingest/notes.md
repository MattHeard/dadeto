# Ledger Ingest

## Outcome

Build a Dadeto toy that imports raw bank and card transaction exports into one canonical ledger through a pure-function core, then grow it outward with thin adapters only after the core import path is stable and useful.

## Current state

This project starts from a PRD rather than an implementation. The intended core is a deterministic JSON-in / JSON-out import function that performs mapping, normalization, validation, deduplication, and summary generation without direct filesystem, database, network, or implicit clock dependencies. The project is meant to prove a Dadeto pattern: narrow real-world workflow first, reusable transformation core second, thin adapters later.

## Constraints

Keep the first implementation slice focused on the pure-function core. Do not hide file IO, persistence, or network calls inside that core. Prefer stable JSON schemas, explicit policy inputs, and fixture-driven unit tests over convenience shortcuts. The MVP should solve statement import cleanly before expanding into categorization, forecasting, dashboards, or bank sync.

## Open questions

- Should `transactionId` be a content-derived hash or assigned by an adapter?
- Should normalized output preserve `rawRow` or `sourceRowIndex` in the MVP?
- Which minimum canonical fields are mandatory across all supported institutions?
- Should sign normalization live in field mapping, normalization policy, or both?
- How strict should duplicate detection be before configurable tolerances are introduced?

## Candidate next actions

- Define the first core module shape and fixture-driven tests for `importTransactions(input)`.
- Add one narrow happy-path fixture for a single institution export and one duplicate-import fixture.
- Define the first canonical transaction schema and structured error format in code-level tests.
- Add the thinnest adapter only after the pure core behavior is stable and useful.
- Decide which open question most threatens MVP correctness and shape a bead around it only if it blocks the first core slice.

## Tentative sequence

1. Start with the pure core contract and one or two real fixture cases.
2. Prove normalization, deduplication, and structured errors on JSON input only.
3. Add a second source or edge case only after the first import path is stable.
4. Introduce adapters for CSV parsing, persistence, or presentation only after the pure core is testable and trustworthy.
5. Tighten the schema and duplicate policy gradually as real import feedback accumulates.

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
