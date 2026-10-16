# THREEFOLD — The Weight of Water

## Summary

- Toy name: THREEFOLD — The Weight of Water
- Owner: Dadeto game workstream
- Last updated: 2026-10-16

## Problem Statement

Prototype a deterministic, scale-shifting handheld RPG in which the player changes the shared physical world instead of jumping between unrelated maps. The initial playable slice establishes the Broken Gate, canonical movement, scale changes, persistent rubble, and deliberate game-time advancement.

## Boundary

Compose pure simulation state with the existing Mosslight handheld renderer, browser input, and an injected save store. Keep browser storage and frame lifecycle outside the domain reducers.

## Scope

- In scope: one contiguous gatehouse scene; scales −2 through +1; directional movement; growth and shrinking; deterministic crisis stages; deliberate waits; slow guaranteed Anchor recovery at one charge per 15 in-game minutes; complete-run save, import, export, and reset; a 160 × 144 standalone handheld page.
- Out of scope: people and ferry choices, combat, repair and evacuation interactions, fluid simulation, later campaign scenes, and scales outside the four authored bands.

## Actors and Interfaces

- Primary actor(s): Mara Venn; the playable preview currently exposes the gatehouse and its geometry.
- Inputs: arrows or directional pad, A to grow, B to shrink, X to wait 15 in-game minutes, Y to save, and save utility controls.
- Outputs: pixel-art frame, current scale/Anchor/crisis HUD, persistent geometry damage, and versioned run saves.

## Assumptions and Constraints

- Assumptions: the current Broken Gate geometry and scale-space reducers are canonical for this slice.
- Constraints: game time advances only from explicit simulation actions; waits after aftermath may restore Anchor but do not advance the crisis stage; rendering keeps Mara's sprite at handheld size; all new toy folders retain the four required docs.

## Dependencies

- Internal dependencies: THREEFOLD simulation, crisis clock, scene, renderer and save codec; Mosslight page presenter, pixel renderer and input adapters.
- External dependencies: browser canvas, localStorage when available, and the existing Dadeto build pipeline.
