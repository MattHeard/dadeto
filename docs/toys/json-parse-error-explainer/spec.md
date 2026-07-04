# Toy Spec: JSON Parse Error Explainer

## Summary
- Toy name: JSON Parse Error Explainer (`JSON2`)
- Blog key: `JSON2`
- Owner: Dadeto browser toys
- Last updated: 2026-07-04

## Problem Statement
- Accept malformed JSON and return a structured error object instead of throwing.
- Surface enough context for a user to understand where parsing broke.

## Boundary
- Keeps the toy synchronous and self-contained.
- Pushes the toy toward diagnostic output instead of transformation.

## Scope
- In scope:
  - Parse a JSON string input.
  - Return the parsed value on success.
  - Return a structured error object on failure with message, approximate failure location, and original input length.
- Out of scope:
  - JSON repair or automatic correction.
  - Schema validation or semantic interpretation.
  - Browser storage, network access, or async behavior.

## Actors and Interfaces
- Primary actor(s): A user debugging malformed JSON.
- Inputs: A JSON string, valid or malformed.
- Outputs: A JSON string containing either the parsed value or a structured error object.

## Assumptions and Constraints
- Assumptions:
  - Native `JSON.parse` error messages are sufficient to derive an approximate location when available.
  - Returning the original input length is enough to help identify truncation or paste issues.
- Constraints:
  - The toy must stay synchronous.
  - The toy must not mutate the input string.

## Dependencies
- Internal dependencies:
  - `src/core/browser/toys/2026-07-04/jsonParseErrorExplainer.js`
  - `test/toys/2026-07-04/jsonParseErrorExplainer.test.js`
- External dependencies:
  - Native `JSON.parse` and `JSON.stringify`.
