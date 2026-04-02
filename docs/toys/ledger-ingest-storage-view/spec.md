# Ledger Ingest Permanent Data View

## Summary
- Toy name: Ledger Ingest Permanent Data View
- Owner: Dadeto browser toys
- Last updated: 2026-04-02

## Problem Statement
- Provide a read-only way to inspect the LEDG3 permanent storage bucket in the same table style used by the ledger ingest report presenter.

## Boundary
- This toy pushes the boundary between permanent browser storage and presenter-backed reporting.

## Scope
- In scope:
- Read the LEDG3 permanent storage bucket.
- Render the stored transactions through the existing ledger-ingest presenter.
- Keep the toy read-only.
- Out of scope:
- Mutating permanent storage.
- Re-importing ledger data.
- Changing the canonical transaction merge policy.

## Actors and Interfaces
- Primary actor(s): A user inspecting stored ledger data.
- Inputs: Optional JSON settings, currently limited to selecting the storage bucket key.
- Outputs: JSON report shaped for the ledger-ingest presenter.

## Assumptions and Constraints
- Assumptions:
- LEDG3 is the bucket key used by the storage toy.
- The existing ledger-ingest presenter can render a report object that includes canonical transactions.
- Constraints:
- The toy must not call `setLocalPermanentData`.

## Dependencies
- Internal dependencies:
- `src/core/browser/toys/2026-03-13/ledger-ingest/ledgerIngestStorageCore.js`
- `src/core/browser/presenters/ledgerIngest.js`
- External dependencies:
- Browser localStorage-backed permanent data access via the toy environment.
