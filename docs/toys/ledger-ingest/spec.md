# Ledger Ingest Toy

## Summary
- Toy name: Ledger Ingest
- Owner: Matt Heard
- Last updated: 2026-03-10

## Problem Statement
- Define and document the pure, deterministic core contract for importing raw exports into a canonical ledger without hiding adapters or IO.

## Boundary
- The ledger-ingest toy sits between raw adapter output and ledger consumers; it enforces JSON-in/JSON-out semantics, normalization, deduplication, and summary generation.

## Scope
- In scope:
  - Explicit `ImportTransactionsInput`/`ImportTransactionsOutput` schemas.
  - Normalization examples (dates, amounts, descriptions) and dedupe key policy.
  - At least two fixtures that prove normalization, dedupe, and summary behavior.
  - Tests that read the fixtures and validate the core behavior without relying on adapters.
- Out of scope:
  - CSV parsing, database writes, network calls, adapter orchestration, or UI layers.
  - Encrypting, persistence, or credential management that belongs to downstream systems.

## Actors and Interfaces
- Primary actor(s): ledger-ingest core (the deterministic processor), adapter builders feeding parsed JSON, and downstream ledger consumers expecting canonical transactions.
- Inputs: `ImportTransactionsInput` (source label, explicit field mapping, rawRecords array, dedupe policy knobs).
- Outputs: `ImportTransactionsOutput` (canonical transactions, duplicate reports, policy/summary metadata consumed by adapters or tests).

## Assumptions and Constraints
- Assumptions:
  - Adapters provide solid raw JSON rows and deliver the field names referenced in `fieldMapping`.
  - Normalization steps (dates -> ISO, amounts -> signed numbers, descriptions -> trimmed lower-case) are sufficient for early dedupe.
  - Duplicate detection is first-wins so adapters can rely on policy reporting rather than silent overwrites.
- Constraints:
  - The core must stay pure (no filesystem, DB, or network calls).
  - All inputs/outputs remain JSON serializable.
  - Behavior must be deterministic so fixtures remain reliable across runs.

## Dependencies
- Internal dependencies:
  - `src/core/ledger-ingest/core.js` – contract, normalization examples, fixtures.
  - `test/toys/2026-03-10/ledger-ingest.test.js` – proof harness that exercises fixtures.
- External dependencies:
  - `npm test` (Jest) – run the fixture suite before closing beads.
