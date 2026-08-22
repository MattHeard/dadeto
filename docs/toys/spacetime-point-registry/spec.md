# Toy Spec: Spacetime Point Registry

## Summary
- Toy name: Spacetime Point Registry (`SPAC1`)
- Owner: Dadeto object-minute rental PoC
- Last updated: 2026-08-19

## Problem Statement
Normalize opaque spacetime-point IDs into canonical values that later domain toys can reference.

## Boundary
SPAC1 defines points only. It knows nothing about customers, runners, assets, possession contexts, warehouses, or segments.

## Scope
- In scope: point IDs, WGS84 latitude/longitude, and UTC-minute timestamps.
- Out of scope: persistence, feasibility, segments, routing, and rental-domain relationships.

## Actors and Interfaces
- Input: JSON object containing a `points` array.
- Output: normalized `points` and a `summary` count.

## Assumptions and Constraints
- Coordinates follow POSS1 semantics, are represented as canonical decimal strings, and are rounded to six decimal places.
- Times follow POSS1’s `YYYY-MM-DDTHH:MMZ` UTC-minute contract.
- Altitude is intentionally deferred.

## Dependencies
- Internal: `src/core/browser/toys/2026-08-19/spacetimePointRegistry.js`.
- External: None.
