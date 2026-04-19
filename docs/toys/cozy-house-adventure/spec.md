# Cozy House Adventure Spec

## Summary
- Toy name: Cozy House Adventure (`COZY1`)
- Owner: agent loop
- Last updated: 2026-04-19

## Problem Statement
- Provide a relaxing text adventure toy that models tiny-house construction with small, readable command loops.

## Boundary
- Exercises the browser toy text-adventure contract: text input + environment map in, narrative text out, temporary state persisted by toy key.

## Scope
- In scope:
  - Name capture and start prompt.
  - Multi-step build loop for foundation/materials/roof/garden.
  - Temporary progression persistence under `temporary.COZY1`.
- Out of scope:
  - New UI presenters.
  - Multiplayer state.
  - Persisting game progress to permanent storage.

## Actors and Interfaces
- Primary actor(s): blog reader using the toy form.
- Inputs: free-text commands such as `build`, `foundation`, `level soil`, `plant herbs`.
- Outputs: narrative response strings and progress prompts.

## Assumptions and Constraints
- Assumptions:
  - Runtime provides `getData`, `setLocalTemporaryData`, `getCurrentTime`, and `getRandomNumber`.
- Constraints:
  - Toy must remain synchronous and return text.
  - State key must not collide with existing toy keys.

## Dependencies
- Internal dependencies:
  - `public/blog.json` toy registration.
  - Jest toy test suite under `test/toys/2026-04-19`.
- External dependencies:
  - None.
