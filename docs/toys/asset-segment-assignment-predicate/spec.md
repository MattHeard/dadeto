# Toy Spec: Asset Segment Assignment Predicate

## Summary
- Toy name: Asset Segment Assignment Predicate (`ASSE3`)
- Owner: Dadeto object-minute rental PoC
- Last updated: 2026-08-20

## Problem Statement
Determine whether a proposed asset-to-segment reference can be appended without assigning overlapping time to the same asset.

## Interface
Input is JSON containing `points`, `segments`, `assignments`, and `proposedAssignment`. Output is the JSON boolean `true` or `false`.

## Rules
- Only existing assignments with the proposed asset's `assetId` are checked.
- Temporal intervals overlap only when their intersection has positive duration.
- Segments that touch at an endpoint are allowed.
- The predicate is pure and does not append or mutate anything.

## Dependencies
- Internal: `src/core/browser/toys/2026-08-20/assetSegmentAssignmentPredicate.js`.
- Domain records: ASSE2 assignments and SPAC1/SPAC2 points and segments.
