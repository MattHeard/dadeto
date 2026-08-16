# Toy Spec: Object-minute Asset Registry

## Summary
- Toy name: Object-minute Asset Registry (`OBJE1`)
- Owner: Dadeto object-minute rental PoC
- Last updated: 2026-08-16

## Problem Statement
Prove the smallest inventory primitive needed to offer a physical object for timed possession.

## Boundary
This toy establishes the boundary between physical asset metadata and later feasibility/reservation logic.

## Scope
- In scope: normalize physical assets, apply safe defaults, sort deterministically, and summarize inventory.
- Out of scope: persistence, authentication, reservations, logistics, pricing, and mutation.

## Actors and Interfaces
- Primary actor: PoC operator registering Matt's assets.
- Input: JSON object containing an `assets` array.
- Output: JSON object containing normalized `assets` and `summary`.

## Assumptions and Constraints
- Asset IDs are stable physical identifiers.
- Missing optional fields receive explicit defaults.
- The toy is synchronous, pure, and deterministic.

## Dependencies
- Internal: `src/core/browser/toys/2026-08-16/assetRegistry.js`.
- External: None.
