# Atlas — Research Context and Experiment Design Records

## Summary
- Toy name: Atlas research coordination core
- Owner: Dadeto interpretability workstream
- Last updated: 2026-10-24

## Problem Statement
Research agents need a reproducible, provenance-preserving view of all context reachable from a candidate mechanism. They also need to keep proposed experiments distinct from executed experiments and measured observations, while retaining the exact evidence and model identity that motivated each proposal.

## Boundary
Keep graph traversal, canonical snapshot identity, paging, experiment-design validation, and portable bundle conversion pure under `src/core/interpretability`. Context reads use the existing service adapter and forward `AllowEffects` to storage. Hashing is an injected pure adapter. The design-record slice stops before adding a storage submission service or proposal generator.

## Scope
- In scope: deterministic graph context snapshots, bounded pages and windows, a content-derived snapshot ID, explicit page/context continuation, preserved warnings and evidence kinds, and permission-aware service access; strict V1 proposed-design records; typed hypothesis/evidence citations; canonical mechanism, component, model and checkpoint identity; source-bound unresolved references; immutable append; and portable V7 import/export with V2–V6 compatibility.
- Out of scope for the design-record slice: proposing designs from context, evidence-sensitive inference, storage submission services, concurrent writes, CLI/agent orchestration, GCP, and billable work. Keep these as separate follow-up work.

## Actors and Interfaces
- Primary actor(s): automated or human research investigator.
- Inputs: validated graph, mechanism ID, depth/page/item bounds, and an optional cursor from a prior response; or a strict untested experiment design with attribution, context snapshot identity, typed citations, rival predictions, falsification condition, and bounded reproducibility envelope.
- Outputs: ordered typed context items, warnings, snapshot ID, page cursor, capped-context continuation, validated immutable design records, portable V7 bundles, and explicit invalid-input errors.

## Assumptions and Constraints
- Assumptions: the portable V6 research bundle and bounded evidence graph are the source of truth; V7 adds designs without changing the legacy V2–V6 formats.
- Constraints: depth is at most four; page size is at most 100; each window is at most 1,000 items; negative/null/contradictory evidence is retained; core code imports no storage or hashing SDK; only the storage call receives `AllowEffects`.

## Dependencies
- Internal dependencies: `getEvidenceGraphContextV1`, portable bundle import, and `createInterpretabilityResearchServiceV1`.
- External dependencies: none in core; a caller supplies the digest function.
