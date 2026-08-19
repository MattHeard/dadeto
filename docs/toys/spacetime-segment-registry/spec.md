# Toy Spec: Spacetime Segment Registry

## Summary
- Toy name: Spacetime Segment Registry (`SPAC2`)
- Owner: Dadeto object-minute rental PoC
- Last updated: 2026-08-19

## Problem Statement
Define ordered spacetime segments using references to canonical SPAC1 points.

## Boundary
SPAC2 knows only segment IDs and ordered point references. It does not know about assets, runners, customers, possession contexts, or requests.

## Scope
- In scope: normalize `segmentId`, `startPointId`, and `endPointId`.
- Out of scope: point lookup, routing, feasibility, duration, pricing, persistence, and domain participation.

## Actors and Interfaces
- Input: JSON object containing a `segments` array.
- Output: normalized `segments` and a `summary` count.

## Assumptions and Constraints
- Point IDs are opaque references to SPAC1 records.
- Start/end ordering is preserved exactly as supplied.
- The toy is synchronous, pure, and deterministic.

## Dependencies
- Internal: `src/core/browser/toys/2026-08-19/spacetimeSegmentRegistry.js`.
- External: None.
