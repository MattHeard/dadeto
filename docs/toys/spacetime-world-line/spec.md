# Toy Spec: Spacetime World Line

## Summary
- Toy name: Spacetime World Line (`SPAC6`)
- Owner: Dadeto spacetime primitives
- Last updated: 2026-08-19

## Problem Statement
Assemble a list of non-overlapping spacetime segments into one ordered contiguous world line.

## Scope
- In scope: endpoint continuity, ordering, and complete segment use.
- Out of scope: routing, feasibility, domain entities, persistence, and segment intersection.

## Interface
Input contains `segments`, `startPointId`, and `endPointId`. Output contains the ordered `segments` sequence.
