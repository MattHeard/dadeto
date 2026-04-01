# Ledger Ingest

## Outcome

Build a Dadeto toy that imports raw bank and card transaction exports into one canonical ledger through a pure-function core that is exposed through a thin end-to-end toy flow, so each iteration is deployable and can be validated with real user feedback.

## Priority

- MoSCoW: Should have. This is now the top-ranked project because it is the clearest Dadeto toy candidate and the first product-surface slice worth keeping visible.
- RICE: Medium impact and moderate effort because it can prove a useful Dadeto pattern, but its reach is narrower than the shared infrastructure work.
- Cost of Delay: Low-to-medium. The main cost is delayed product value rather than compounding repo-wide debt.

## Current state

This project now has a first real implementation slice rather than only a PRD, and the thin toy wrapper already exists. The core is exposed through `src/core/browser/toys/2026-03-13/ledger-ingest/ledgerIngestToy.js`, the focused toy test already exercises the wrapper path, there is now a separate CSV converter toy that emits copyable JSON for the main import toy, and LEDG2 can accept CSV through the file input path. The remaining work is not to invent the first wrapper, but to make the user-facing surfaces more useful and more obviously inspectable in small increments.

The intended core remains a deterministic JSON-in / JSON-out import function that performs mapping, normalization, validation, deduplication, and summary generation without direct filesystem, database, network, or implicit clock dependencies. That core is already living inside the toy structure like the repo's other toys, so each meaningful iteration should now move the toy toward a better user-testable end-to-end flow rather than stopping at inaccessible internal seams.

The main import toy should stay focused on the JSON/import path: it can run named fixtures for demos, or accept a pasted `ImportTransactionsInput` payload directly. The separate CSV converter toy should be the first personal-use surface: it accepts a semicolon-delimited transaction CSV, converts it into JSON adapter records, and emits the JSON payload that the main toy accepts. The CSV contract for that adapter lives in `projects/ledger-ingest/csv-schema.md`.

Recommended next toy:

- A dedicated `ledger-ingest storage` toy that accepts canonical transactions or `ImportTransactionsInput`, persists them into an explicit local storage adapter, and shows insert, update, skip, and duplicate/merge outcomes side by side. This fits the project because it moves from import-only validation into the next useful behavior: retaining canonical transactions across runs while keeping persistence visible and testable.

- Freshness check: reviewed on 2026-03-30 and updated to reflect the existing thin-wrapper / user-testable flow.

## Constraints

Keep the pure-function core explicit and free of hidden file IO, persistence, or network calls, but do not let the project stall as a core-only library. Prefer stable JSON schemas, explicit policy inputs, and fixture-driven unit tests, while ensuring each iteration still moves toward a thin user-testable toy wrapper that can be validated end to end. The MVP should solve statement import cleanly before expanding into categorization, forecasting, dashboards, or bank sync.

## Open questions

- Should `transactionId` be a content-derived hash or assigned by an adapter?
- Should normalized output preserve `rawRow` or `sourceRowIndex` in the MVP?
- Which minimum canonical fields are mandatory across all supported institutions?
- Should sign normalization live in field mapping, normalization policy, or both?
- How strict should duplicate detection be before configurable tolerances are introduced?

## Candidate next actions

- Improve the toy surface so a user can see the canonical rows, duplicate reports, and structured errors more directly.
- Add a real UI affordance or local command path for pasting or uploading a transaction CSV into the converter toy instead of selecting a fixture.
- Keep the import toy focused on accepting JSON directly, then make that copy-paste path obvious in the UI.
- Build or refine the CSV-to-JSON adapter toy that parses the documented semicolon-delimited schema into the existing import core input shape.
- Build the dedicated ledger-ingest storage toy described above so canonical transactions can be saved and merged through an explicit local adapter boundary.
- Continue adding narrow fixtures for structured error reporting or institution mapping edge cases, but only in support of the user-testable toy flow.
- Define the first canonical transaction schema and structured error format in code-level tests where that contract is still implicit.
- Decide which open question most threatens MVP correctness and shape a bead around it only if it blocks the next user-visible slice.

## Tentative sequence

1. Keep the core pure and keep the main toy wrapper thin.
2. Keep the main toy focused on JSON import payloads and the fixture demo path.
3. Keep the separate CSV converter toy focused on producing copyable JSON for the main toy.
4. Improve the user-facing toy flow so the canonical rows, duplicates, and structured errors are easier to inspect.
5. Add a dedicated ledger-ingest storage toy once the project needs a persistent local merge boundary.
6. Prove normalization, deduplication, and structured errors through the JSON import path plus focused tests.
7. Add a second source or edge case only after the first CSV conversion path is stable and understandable.
8. Tighten the schema and duplicate policy gradually as real user feedback accumulates.

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
