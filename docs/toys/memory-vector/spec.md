# Toy Spec: Memory Vector

## Summary
- Toy name: Memory Vector (`MEMO1`)
- Owner: Dadeto browser toys
- Last updated: 2026-05-28

## Problem Statement
- Provide a small inspection toy that can read from an existing Dadeto memory location and project the selected value into a consistent vector-shaped JSON response.

## Boundary
- Exercises the browser toy contract for read-only inspection across existing storage helpers without mutating any memory bucket.

## Scope
- In scope:
  - Read a selected memory location.
  - Resolve a dot-path or key path within that memory root.
  - Wrap scalar values in a one-item vector while preserving array-shaped values.
  - Support the memory locations currently exposed by the repo helpers: temporary, permanent, and the full envelope.
- Out of scope:
  - Writing or mutating any memory bucket.
  - New UI presenters.
  - New storage backends.
  - Cross-toy synchronization.

## Actors and Interfaces
- Primary actor(s): A user inspecting stored toy or browser state.
- Inputs: Plain path text or a JSON object containing `memoryLocation`, `path`, or `key`.
- Outputs: A JSON string describing the selected location, path, lookup status, and vector projection.

## Assumptions and Constraints
- Assumptions:
  - The runtime provides `getData` for temporary/envelope reads and `getLocalPermanentData` for permanent reads.
  - The existing `get` toy can resolve dot paths inside the selected root.
- Constraints:
  - The toy must remain synchronous.
  - The toy must not mutate data.
  - Unknown or missing keys should fail cleanly with a structured error payload.

## Dependencies
- Internal dependencies:
  - `src/core/browser/toys/2026-05-28/memoryVector.js`
  - `src/build/blog.json`
  - `test/toys/2026-05-28/memoryVector.test.js`
- External dependencies:
  - Browser toy runtime helpers supplied through the env map.
