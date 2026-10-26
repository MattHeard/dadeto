# Agricultural Rover Feasibility Toy

## Summary
- Toy name: Agricultural Rover
- Owner: Dadeto product engineering
- Last updated: 2026-10-26

## Problem Statement
Help a reader explore when a hypothetical autonomous weeding rover could fit a field job and compare its time and cost with an existing manual process. The model makes assumptions visible and does not present synthetic inputs as field evidence.

## Boundary
The calculation is a pure deterministic browser-core model. The client-only presenter collects explicit assumptions, displays the comparison and thresholds, and exports or imports a recalculated readiness brief. It has no network, account, provider, or hardware integration.

## Scope
- In scope: explicit SI area and time units; manual labor baseline marked observed or assumed; fleet size, effective throughput, battery and charging, downtime, supervision, interventions, operating and hypothetical capital costs; operating-window capacity; labeled conservative/base/optimistic sensitivity; break-even thresholds; optional baseline entity identifiers.
- Out of scope: vendor performance claims, agronomic efficacy, route planning, field sensing, procurement advice, probabilistic forecasts, external simulation services, and real hardware control.

## Actors and Interfaces
- Primary actor(s): a reader comparing a synthetic or user-entered weeding job.
- Inputs: a `RoverInput` object documented in `src/core/browser/game/agricultural-rover/agricultural-rover.js`.
- Outputs: deterministic duration, coverage, labor, costs, savings, break-even jobs, validation messages, and named sensitivity estimates.

## Assumptions and Constraints
- Assumptions: effective coverage already accounts for field conditions; all money is integer cents; downtime is a percentage; comparison jobs spread hypothetical purchase price evenly; intervention events round up to whole events.
- Constraints: reject invalid, non-finite, negative, or zero-capacity inputs with explicit issues; do not mutate supplied inputs; sensitivity labels are scenario assumptions, not confidence intervals.

## Dependencies
- Internal dependencies: none beyond JavaScript built-ins.
- External dependencies: none at runtime. Jest is used only for repository tests.
