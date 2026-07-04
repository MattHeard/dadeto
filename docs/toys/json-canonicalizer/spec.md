# Toy Spec: JSON Canonicalizer

## Summary
- Toy name: JSON Canonicalizer (`JSON1`)
- Blog key: `JSON1`
- Owner: Dadeto browser toys
- Last updated: 2026-07-04

## Problem Statement
- Accept any valid JSON value and return a stable, pretty-printed JSON string.
- Normalize object key ordering so equivalent JSON values always render the same way.

## Boundary
- Keeps the toy synchronous and pure JSON-in/JSON-out.
- Pushes the toy layer into deterministic canonical formatting without depending on stateful helpers.

## Scope
- In scope:
  - Parse a JSON string input.
  - Canonically sort object keys at every nesting level.
  - Preserve array order and scalar values.
  - Emit pretty-printed JSON with a stable indentation style.
- Out of scope:
  - JSON5, comments, trailing commas, or any non-JSON syntax.
  - Schema validation or semantic normalization beyond key ordering.
  - Browser storage, network access, or async behavior.

## Actors and Interfaces
- Primary actor(s): A user who wants a canonical JSON rendering.
- Inputs: A JSON string containing any valid JSON value.
- Outputs: A pretty-printed canonical JSON string or a structured parse error.

## Assumptions and Constraints
- Assumptions:
  - Deterministic object key order is enough to make equivalent values comparable.
  - Pretty printing should use a fixed two-space indent.
- Constraints:
  - The toy must stay synchronous.
  - The toy must not mutate the parsed input value.

## Dependencies
- Internal dependencies:
  - `src/core/browser/toys/2026-07-04/jsonCanonicalizer.js`
  - `test/toys/2026-07-04/jsonCanonicalizer.test.js`
- External dependencies:
  - Native `JSON.parse` and `JSON.stringify`.
