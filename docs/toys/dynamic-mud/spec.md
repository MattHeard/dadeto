# Dynamic MUD — Safe command-handler vertical slice

## Summary
- Toy name: Dynamic MUD
- Owner: Dadeto game systems
- Last updated: 2026-10-23

## Problem Statement
Explore a data-only command language for graph-backed multiplayer worlds. The first slice establishes how commands can inspect and change a world safely before any language-model adapter is considered.

## Boundary
The boundary is a pure core interpreter between a validated finite AST and an immutable graph snapshot. It has no browser, persistence, network, clock, or model dependency.

## Scope
- In scope: versioned AST validation; bounded node/relation graph; get, find, create, set property, add/remove relation, delete, output and broadcast operations; serial execution; all-or-nothing transaction result; output/broadcast intents.
- Out of scope: UI, natural-language parsing, model-generated commands, adapters, persistence, multiplayer transport, event sourcing, authorization policy, command scheduling, and deployment. This slice does not claim a playable end-to-end MUD.

## Actors and Interfaces
- Primary actor(s): tests and a future trusted command adapter.
- Inputs: a plain JSON-like world snapshot and version 1 command program.
- Outputs: either a new world and ordered results/intents, or an error with the untouched original world.

## Assumptions and Constraints
- Assumptions: callers own persistence and may commit the returned snapshot only when `ok` is true.
- Constraints: at most 32 operations, 256 nodes/relations/collection entries, bounded nested values, safe identifiers, no arbitrary source text or executable functions. Commands execute serially. Missing or stale references fail the entire transaction.

## Dependencies
- Internal dependencies: none.
- External dependencies: none.
