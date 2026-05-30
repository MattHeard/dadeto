# Toy Spec: Memory Scalar/Vector Write

## Summary
- Toy name: Memory Scalar/Vector Write (`MEMO3`)
- Owner: Dadeto toy loop
- Last updated: 2026-05-30

## Problem Statement
- Provide a small write toy that can insert or update a JSON scalar or vector at an arbitrary dot-path key in the existing Dadeto memory locations.
- Keep the write behavior easy to verify by reading the same memory location and path with `MEMO2`.

## Boundary
- Exercises the browser toy contract for stateful memory mutation while keeping inspection in the existing read-only `MEMO2` toy.

## Scope
- In scope:
  - Accept JSON object requests with `memoryLocation`, `path` or `key`, and `value`.
  - Default to temporary memory when `memoryLocation` is omitted.
  - Support `temporary`, `permanent`, and full `envelope` memory locations.
  - Permit scalar values (`null`, string, number, boolean) and vector values (JSON arrays).
  - Create missing nested object or array containers along the requested dot path.
  - Return structured JSON with write status, normalized location, path, and value or error.
- Out of scope:
  - Writing arbitrary object payloads as leaf values; object values are reserved for constructed containers.
  - Escaped-dot path syntax for keys that literally contain `.`.
  - Direct DOM mutation or output rendering customization.

## Actors and Interfaces
- Primary actor(s): Browser toy user, automated Jest harness.
- Inputs: JSON object such as `{ "memoryLocation": "temporary", "path": "profile.name", "value": "Ada" }`.
- Outputs: JSON write result; persisted memory state observable through `MEMO2`.

## Assumptions and Constraints
- Assumptions:
  - `MEMO2` remains the canonical read-side validator for memory vector projections.
  - The runtime provides the same storage helpers used by `MEMO1`/`MEMO2` for temporary, permanent, and envelope memory.
- Constraints:
  - Temporary and envelope writes must preserve an object with a `temporary` property so the existing persistence helper accepts the update.
  - Permanent writes persist through `setLocalPermanentData`, whose public contract requires an object root.

## Dependencies
- Internal dependencies:
  - `src/core/browser/toys/2026-05-28/memoryScalarVectorWrite.js`
  - `src/core/browser/toys/2026-05-28/memoryVectorPairs.js`
  - `src/build/blog.json`
  - `test/toys/2026-05-28/memoryScalarVectorWrite.test.js`
- External dependencies:
  - Jest local unit-test runner.
