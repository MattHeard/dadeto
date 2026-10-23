# Atlas — Research Context Snapshot Slice

## Summary
- Toy name: Atlas research coordination core
- Owner: Dadeto interpretability workstream
- Last updated: 2026-10-23

## Problem Statement
Research agents need a reproducible, provenance-preserving view of all context reachable from a candidate mechanism. Ordinary pages can split records across requests without proving that the source data stayed the same or that the context is complete.

## Boundary
Keep graph traversal, canonical snapshot identity, validation, and paging pure under `src/core/interpretability`. Load the portable bundle only through the existing service adapter, forwarding `AllowEffects` to storage. Hashing is an injected pure adapter.

## Scope
- In scope: deterministic graph context snapshots, bounded pages and windows, a content-derived snapshot ID, explicit page/context continuation, preserved warnings and evidence kinds, and permission-aware service access.
- Out of scope: experiment-design records, proposal persistence, concurrent writes, CLI/agent orchestration, model inference, GCP, and billable work.

## Actors and Interfaces
- Primary actor(s): automated or human research investigator.
- Inputs: validated graph, mechanism ID, depth/page/item bounds, and an optional cursor from a prior response.
- Outputs: ordered typed context items, warnings, snapshot ID, page cursor, capped-context continuation, and explicit invalid-input errors.

## Assumptions and Constraints
- Assumptions: the portable V6 research bundle and bounded evidence graph are the source of truth.
- Constraints: depth is at most four; page size is at most 100; each window is at most 1,000 items; negative/null/contradictory evidence is retained; core code imports no storage or hashing SDK; only the storage call receives `AllowEffects`.

## Dependencies
- Internal dependencies: `getEvidenceGraphContextV1`, portable bundle import, and `createInterpretabilityResearchServiceV1`.
- External dependencies: none in core; a caller supplies the digest function.
