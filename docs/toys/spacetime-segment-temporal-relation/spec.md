# Toy Spec: Spacetime Segment Temporal Relation

## Summary
- Toy name: Spacetime Segment Temporal Relation (`SPAC3`)
- Owner: Dadeto spacetime primitives
- Last updated: 2026-08-19

## Problem Statement
Classify the temporal relationship between two spacetime segments without applying business logic.

## Boundary
SPAC3 resolves SPAC2 segment references through SPAC1 timestamps. It does not know about assets, runners, customers, or feasibility.

## Scope
- In scope: `disjoint`, `touching`, and `overlapping` temporal relations.
- Out of scope: spatial intersection, routing, domain participation, persistence, and scheduling.

## Contract
- Input: `points`, `segments`, `firstSegmentId`, and `secondSegmentId`.
- Closed intervals are used. Shared boundary instants are `touching` only when the boundary point IDs are identical; shared non-zero duration is `overlapping` regardless of point identity.
