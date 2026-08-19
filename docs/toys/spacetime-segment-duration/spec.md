# Toy Spec: Spacetime Segment Duration

## Summary
- Toy name: Spacetime Segment Duration (`SPAC5`)
- Owner: Dadeto spacetime primitives
- Last updated: 2026-08-19

## Problem Statement
Calculate the UTC duration between a SPAC2 segment’s start and end points.

## Scope
- In scope: UTC timestamp subtraction in seconds.
- Out of scope: distance, travel time, routing, feasibility, and persistence.

## Interface
Input contains `points` and one SPAC2-shaped `segment`. Output contains `{ "value": "...", "unit": "seconds" }`; both output fields are strings.
