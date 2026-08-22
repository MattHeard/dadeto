# SKUE1 — SKU Existing-Stock Feasibility

Use this file to define what the toy is and what it is not.

## Summary

- Toy name: SKU Existing-Stock Feasibility
- Owner: Dadeto PoC
- Last updated: 2026-08-23

## Problem Statement

Whether at least one existing physical asset can follow a normal fulfillment proposal for a requested SKU.

## Boundary

SKU candidate iteration over the single-asset feasibility predicate.

## Scope

- In scope: exact SKU filtering, lexical asset ordering, and short-circuiting.
- Out of scope: runner checks, procurement, selection, persistence, pricing, and offers.

## Actors and Interfaces

- Inputs: `requestedSku`, assets, proposal, and resolved spatial records.
- Outputs: `{ "feasible": boolean }`.

## Assumptions and Constraints

- Assumptions: each candidate is evaluated independently by EXIS1.
- Constraints: asset IDs determine stable iteration order.

## Dependencies

- Internal dependencies: EXIS1.
- External dependencies: none.
