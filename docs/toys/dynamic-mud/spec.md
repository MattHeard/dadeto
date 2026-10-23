# Dynamic MUD — Safe command-handler vertical slice

## Summary
- Toy name: Dynamic MUD
- Owner: Dadeto game systems
- Last updated: 2026-10-23

## Problem Statement
Explore a data-only command language for graph-backed multiplayer worlds. The first slice establishes how commands can inspect and change a world safely before any language-model adapter is considered.

## Boundary
The bounded DSL interpreter remains pure and dependency-free. A browser adapter now wraps it in one playable Harrowfen scene with registered known commands. Unknown commands are rejected without mutation until a reviewed adapter can call the billed chat service and validate generated proposals.

## Scope
- In scope: versioned AST validation; bounded node/relation graph; get, find, create, set property, add/remove relation, delete, output and broadcast operations; serial execution; all-or-nothing transaction result; output/broadcast intents; one browser-playable scene with known commands and visible state changes.
- Out of scope for this bounded increment: persistence, multiplayer transport, event sourcing, authorization policy, command scheduling, and model-generated command registration. The full Notion acceptance still requires the deployed billed chat proxy for unknown-command generation; deterministic providers are test-only.

## Actors and Interfaces
- Primary actor: a player at the Rain Causeway, with tests exercising the finite DSL.
- Inputs: a plain JSON-like world snapshot and version 1 command program.
- Outputs: visible text and a changed in-memory world for known actions; otherwise an explicit unknown-action response with the graph unchanged.

## Assumptions and Constraints
- Assumptions: callers own persistence and may commit the returned snapshot only when `ok` is true.
- Constraints: at most 32 operations, 256 nodes/relations/collection entries, bounded nested values, safe identifiers, no arbitrary source text or executable functions. Commands execute serially. Missing or stale references fail the entire transaction.

## Dependencies
- Internal dependencies: none.
- External dependencies: none.
