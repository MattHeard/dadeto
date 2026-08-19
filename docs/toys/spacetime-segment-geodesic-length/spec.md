# Toy Spec: Spacetime Segment Geodesic Length

## Summary
- Toy name: Spacetime Segment Geodesic Length (`SPAC4`)
- Owner: Dadeto spacetime primitives
- Last updated: 2026-08-19

## Problem Statement
Calculate the direct WGS84 surface length of a segment between two SPAC1 points.

## Scope
- In scope: WGS84 ellipsoidal surface distance in meters.
- Out of scope: altitude, time, roads, routing, travel duration, and persistence.

## Interface
Input contains `points` and one SPAC2-shaped `segment`. Output contains `{ "value": "...", "unit": "meters" }`; both output fields are strings.
