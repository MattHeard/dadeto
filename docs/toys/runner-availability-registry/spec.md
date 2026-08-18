# Toy Spec: Runner Availability Registry

## Summary
- Toy name: Runner Availability Registry (`RUNN1`)
- Owner: Dadeto object-minute rental PoC
- Last updated: 2026-08-18

## Problem Statement
Register the runner pool and the time windows in which each runner is available for future runs.

## Boundary
This toy establishes runner availability as a separate registry from assets and possession requests.

## Scope
- In scope: normalize multiple runners and their availability windows.
- Out of scope: jobs, routing, travel time, matching, persistence, and optimization.

## Actors and Interfaces
- Primary actor: PoC operator registering runner availability.
- Input: JSON object containing a `runners` array.
- Output: JSON object containing normalized `runners` and a `summary`.

## Assumptions and Constraints
- Availability windows use caller-provided time strings.
- The toy is synchronous, pure, and deterministic.

## Dependencies
- Internal: `src/core/browser/toys/2026-08-18/runnerAvailabilityRegistry.js`.
- External: None.
