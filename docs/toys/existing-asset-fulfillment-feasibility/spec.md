# EXIS1 — Existing Asset Fulfillment Feasibility

Use this file to define what the toy is and what it is not.

## Summary

- Toy name: Existing Asset Fulfillment Feasibility
- Owner: Dadeto PoC
- Last updated: 2026-08-23

## Problem Statement

Whether one concrete asset can accommodate the asset-relevant operations in a normal proposal.

## Boundary

Candidate fulfillment geometry against an asset's committed world line.

## Scope

- In scope: delivery outbound, possession, pickup return, inspection, and cleaning.
- Out of scope: runner checks, SKU selection, procurement, persistence, costing, and offers.

## Actors and Interfaces

- Inputs: `asset`, `proposal`, and resolved points/space points JSON.
- Outputs: `{ "feasible": boolean }`, with a reason on rejection.

## Assumptions and Constraints

- Assumptions: stock-in is the asset's entry anchor and there is no stock-out anchor.
- Constraints: each asset operation must occur exactly once in the proposal.

## Dependencies

- Internal dependencies: canonical segment world-line evaluator.
- External dependencies: none.
