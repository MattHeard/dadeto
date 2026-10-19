# THREEFOLD — The Weight of Water

## Summary

- Toy name: THREEFOLD — The Weight of Water
- Owner: Dadeto game workstream
- Last updated: 2026-10-19

## Problem Statement

Prototype a deterministic, scale-shifting handheld RPG in which the player changes the shared physical world instead of jumping between unrelated maps. The initial playable slice establishes the Broken Gate, canonical movement, scale changes, persistent rubble, and deliberate game-time advancement.

## Boundary

Compose pure simulation state with the existing Mosslight handheld renderer, browser input, and an injected save store. Keep browser storage and frame lifecycle outside the domain reducers.

## Scope

- In scope: one contiguous gatehouse scene; an opening dock-worker warning and open-ended investigation objective; scales −2 through +1; directional movement; growth and shrinking; deterministic crisis stages; deliberate waits; slow guaranteed Anchor recovery at one charge per 15 in-game minutes; direct passenger evacuation at the ferry mooring before surge, with deterministic ferry and passenger outcomes; a first irreversible relief-gate branch whose damaged gate floods the lower drainage settlement at surge; complete-run save, import, export, and reset; a 160 × 144 standalone handheld page.
- Out of scope: simulated individual passenger/NPC behavior, combat, gate repair and lower-settlement evacuation interactions, physically simulated fluid dynamics, later campaign scenes, and scales outside the four authored bands.

## Actors and Interfaces

- Primary actor(s): Mara Venn; the dock worker has one opening callout but is not yet a simulated NPC.
- Inputs: arrows or directional pad, A to grow, B to shrink, E or gamepad left shoulder or the touch rescue button to interact at the ferry mooring, X to wait 15 in-game minutes, Y to save, and save utility controls.
- Outputs: pixel-art frame, current scale/Anchor/crisis HUD, a normalized deterministic tide gauge, persistent geometry damage, passenger and ferry outcomes, the derived gate/drainage outcome and render-only surge floodwater, and versioned run saves.
- The shared Mosslight frame includes a deterministic screen-space tide gauge: fill follows elapsed crisis game time, capped at the authored aftermath boundary, and color follows the current crisis stage.

## Assumptions and Constraints

- Assumptions: the current Broken Gate geometry and scale-space reducers are canonical for this slice; passengers can be evacuated by working the ferry mooring.
- Constraints: gate and flood outcomes derive from saved geometry damage and deterministic crisis time; passenger rescue requires an in-range interaction begun before surge; at surge the ferry is lost and passengers still aboard are lost; prior evacuation persists. The flooded patch is a visual consequence, not collision geometry or a fluid simulation. The opening callout and investigation goal appear only before the first timed action; game time advances only from explicit simulation actions; waits after aftermath may restore Anchor but do not advance the crisis stage; rendering keeps Mara's sprite at handheld size; all new toy folders retain the four required docs.

## Dependencies

- Internal dependencies: THREEFOLD simulation, crisis clock, scene, renderer and save codec; Mosslight page presenter, pixel renderer and input adapters.
- External dependencies: browser canvas, localStorage when available, and the existing Dadeto build pipeline.
