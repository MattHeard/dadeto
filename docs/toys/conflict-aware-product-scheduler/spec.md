# Toy Spec: Conflict-Aware Product Scheduler

## Summary
- Toy name: Conflict-Aware Product Scheduler (`SCHD1`)
- Owner: Dadeto browser toys
- Last updated: 2026-06-15

## Problem Statement
- Rank candidate product increments by value versus coordination cost.
- Keep the slice local and deterministic so it can be used as a five-minute scheduling aid.

## Boundary
- Pushes the toy system toward simple multi-candidate planning with conflict awareness.
- Stays strictly JSON-in / JSON-out with no external calendar, database, or network dependency.

## Scope
- In scope:
  - Parse `candidates` and `activeWork` from JSON input.
  - Score candidates with product, learning, feedback, and coordination-cost terms.
  - Return a ranked recommendation list with a short explanation for each candidate.
  - Register the toy in the public blog manifest.
- Out of scope:
  - Live calendar integration.
  - Background scheduling across multiple sessions.
  - Persistence beyond the returned JSON payload.

## Actors and Interfaces
- Primary actor(s): A maintainer or agent choosing the next small product increment.
- Inputs: JSON with `candidates` and `activeWork`; each candidate may include `id`, `title`, `productValue`, `learningValue`, `userFeedbackValue`, `expectedTouchSet`, `sharedTouchRisk`, `expectedTestRefactorCollision`, and `expectedDeploymentRisk`.
- Outputs: JSON with a sorted `ranked` array, each item containing score and penalty breakdown.

## Assumptions and Constraints
- Assumptions:
  - Missing numeric fields default to zero.
  - Missing touch sets default to empty lists.
- Constraints:
  - Sorting must be deterministic.
  - The toy must remain synchronous and pure.

## Dependencies
- Internal dependencies:
  - `src/core/browser/toys/2026-06-15/conflictAwareProductScheduler.js`
  - `src/build/blog.json`
- External dependencies:
  - None.
