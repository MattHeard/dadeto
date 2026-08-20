# Toy Spec: Asset Segment Assignment List

## Summary
- Toy name: Asset Segment Assignment List (`ASSE2`)
- Owner: Dadeto object-minute rental PoC
- Last updated: 2026-08-20

## Problem Statement
Append immutable references connecting an asset to a spacetime segment.

## Boundary
ASSE2 knows only asset and segment IDs. It does not resolve either reference or model timing, routing, allocation, or business state.

## Scope
- In scope: validate `assetId` and `segmentId`, then append the pair to a selected memory list.
- Out of scope: updates, removal, deduplication, lookups, and feasibility.

## Interface
Input is JSON containing `memoryLocation`, `path`, and `assignment: {assetId, segmentId}`. Output is MEMO4's append result.

## Dependencies
- Internal: `src/core/browser/toys/2026-08-20/assetSegmentAssignmentList.js`.
- Persistence primitive: MEMO4.
