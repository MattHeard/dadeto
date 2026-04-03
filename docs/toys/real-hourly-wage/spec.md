# Toy Spec

## Summary
- Toy name: Real Hourly Wage
- Owner: Matt Heard
- Last updated: 2026-04-03

## Problem Statement
- Show how much of an hourly wage remains after accounting for the unpaid time and expenses that support the paid job.

## Boundary
- This toy stays pure at the calculation boundary and keeps parsing, validation, and presentation concerns separate from the wage formula itself.

## Scope
- In scope:
  - A single pure calculation interface that accepts normalized wage inputs.
  - A readable breakdown of paid hours, overhead hours, and overhead expenses.
  - Deterministic output that downstream toys can reuse without recomputing the totals.
- Out of scope:
  - Currency conversion.
  - Time-series tracking.
  - Storage or persistence.
  - UI formatting beyond returning JSON.

## Actors and Interfaces
- Primary actor(s): A person modeling the real cost of a job.
- Inputs: A JSON object with `period` totals and `overhead` hour/expense buckets.
- Outputs: A JSON wage report with nominal wage, real wage, totals, and a breakdown.

## Assumptions and Constraints
- Assumptions:
  - The calculation period is already chosen before the toy runs.
  - The input numbers are normalized and non-negative.
- Constraints:
  - The calculation must remain deterministic.
  - The toy must not read or write local storage.
  - The pure core must not depend on dates or external services.

## Dependencies
- Internal dependencies:
  - `src/core/browser/toys/2026-04-03/realHourlyWage.js`
  - `test/toys/2026-04-03/realHourlyWage.test.js`
- External dependencies:
  - `npm test`
  - `npm run build`
