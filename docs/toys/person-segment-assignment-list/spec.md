# Toy Spec: Person Segment Assignment List

## Summary
- Toy name: Person Segment Assignment List (`PERS1`)
- Last updated: 2026-08-20

Append immutable `{personId, segmentId}` references to a selected memory list.

## Boundary
PERS1 does not resolve people or segments and does not perform scheduling or feasibility checks. It supports temporary, permanent, and envelope memory.

## Interface
Input: `memoryLocation`, `path`, and `assignment`. Output: append result with the resulting length.
