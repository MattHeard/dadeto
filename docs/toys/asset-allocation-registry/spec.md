# Toy Spec: Asset Allocation Registry

## Summary
- Toy name: Asset Allocation Registry (`ASSE1`)
- Owner: Dadeto object-minute rental PoC
- Last updated: 2026-08-18

## Problem Statement
Record which physical asset is allocated to a possession context for the entire operational period, including transport to and from the customer.

## Boundary
This toy links assets and possession contexts without coupling an allocation directly to a possession request.

## Scope
- In scope: normalize allocations, transport-inclusive windows, status, and deterministic ordering.
- Out of scope: request references, runner assignment, route planning, persistence, and conflict detection.

## Actors and Interfaces
- Primary actor: PoC operator allocating an asset.
- Input: JSON object containing an `allocations` array.
- Output: JSON object containing normalized `allocations` and a `summary`.

## Assumptions and Constraints
- `possessionContextId` is the shared relationship key.
- `allocatedFrom` and `allocatedTo` cover transport, possession, and return.
- The toy is synchronous, pure, and deterministic.

## Dependencies
- Internal: `src/core/browser/toys/2026-08-18/assetAllocationRegistry.js`.
- External: None.
