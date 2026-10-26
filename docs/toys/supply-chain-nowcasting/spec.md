# Supply-chain Nowcasting Toy

## Summary
- Toy name: Supply-chain Nowcasting
- Owner: Dadeto product engineering
- Last updated: 2026-10-26

## Problem Statement
Show how a disruption warning can create useful lead time to mitigate a hypothetical supply shortfall, using a small inspectable synthetic network.

## Boundary
Keep network validation, inventory simulation, shortfall calculation, and mitigation ranking deterministic and pure in `src/core/browser/game/supply-chain-nowcasting/`. Browser presentation and export stay in adapters.

## Scope
- In scope: synthetic supplier-to-destination network; disruptions and warning lead time; deterministic inventory/shortfall timeline; capacity- and lead-time-constrained mitigations; explainable ranking; current and future warnings; complete assumptions export; optional entity identifiers.
- Out of scope: live supply-chain data, paid services, real forecasts, autonomous ordering or execution, and claims that hypothetical warnings are real predictions.

## Actors and Interfaces
- Primary actor(s): a reader exploring a hypothetical supply disruption.
- Inputs: explicit-unit supplier, lane, destination, demand, disruption, and mitigation records.
- Outputs: baseline timeline, warning signal, ranked feasible mitigations, explicit validation issues, and portable JSON assumptions/results.

## Assumptions and Constraints
- Assumptions: all quantities are synthetic; time is integer days from the scenario start; demand is constant per day unless explicitly modeled by a later slice.
- Constraints: reject duplicate/missing identifiers, cycles, invalid units, negative or non-finite values, and impossible plans; ranking is deterministic and explainable; no mitigation exceeds stated capacity or lead time.

## Dependencies
- Internal dependencies: JavaScript built-ins only in the pure model.
- External dependencies: none at runtime. Jest tests model behavior.
