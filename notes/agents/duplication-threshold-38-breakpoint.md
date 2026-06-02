# Duplication Threshold 38 Breakpoint

Date: 2026-06-02

## Unexpected Hurdle

Dropping `minTokens` from `39` to `38` exposed two 38-token clones: one in
`src/core/local/notion-codex/config.js` versus the ledger-ingest toy, and one
between the `mark-variant-dirty` and `submit-new-story` cloud run wireups.
An initial attempt also tripped TSDoc because the shared helper import path was
off by one directory level.

## Diagnosis Path

The object-normalization clone matched a helper that already existed in
`src/core/commonCore.js`. The cloud run clone matched the repeated Firebase app
bootstrap and wiring shape.

## Chosen Fix

Reuse `objectOrEmpty` from `src/core/commonCore.js`, add a small
`createFirebaseAppContext(...)` helper in
`src/core/cloud/firebase-app-manager.js`, and point both cloud run files at that
shared helper.

## Evidence

- `npm run duplication` passed with `0 clones` at `minTokens: 38`.
- `npm run check` passed all 8 checks at `minTokens: 38`.

## Next-Time Guidance

If the duplication threshold goes lower again, start by checking whether the
clone is already represented by a shared helper before adding a new one.
