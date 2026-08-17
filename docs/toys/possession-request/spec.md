# Toy Spec: Possession Request

## Summary
- Toy name: Possession Request (`POSS1`)
- Owner: Dadeto object-minute rental PoC
- Last updated: 2026-08-17

## Problem Statement
Represent the exact object, places, and times a customer wants to possess before feasibility is considered.

## Boundary
This toy establishes the structured request boundary between the customer experience and logistics feasibility.

## Scope
- In scope: SKU normalization, WGS84 coordinate validation/rounding, and UTC-minute validation.
- Out of scope: inventory lookup, travel time, pricing, reservations, and offer creation.

## Actors and Interfaces
- Primary actor: a customer or agent submitting a rental request.
- Input: JSON with `sku`, delivery/pickup locations, and delivery/pickup UTC-minute times.
- Output: `{valid, request}` or `{valid: false, errors}`.

## Assumptions and Constraints
- Coordinates use `lat` and `lon` in WGS84 degrees.
- Coordinates are emitted to six decimal places.
- Times must use the `YYYY-MM-DDTHH:MMZ` UTC-minute form.
- Output and error ordering are deterministic.

## Dependencies
- Internal: `src/core/browser/toys/2026-08-17/possessionRequest.js`.
- External: None.
# Custom input

The beta input method `possession-request` presents labeled request fields for
SKU, delivery and pickup coordinates, and timestamps, then serializes them to
the existing possession-request JSON payload.
