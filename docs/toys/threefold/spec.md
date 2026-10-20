# THREEFOLD — The Weight of Water

## Summary

- Toy name: THREEFOLD — The Weight of Water
- Owner: Dadeto game workstream
- Last updated: 2026-10-19

## Problem Statement

Prototype a deterministic, scale-shifting handheld RPG in which the player changes the shared physical world instead of jumping between unrelated maps. The Broken Gate slice establishes canonical movement, scale changes, persistent rubble, deliberate game-time advancement, and one rat-sized fight-or-bypass encounter.

## Boundary

Compose pure simulation state with the existing Mosslight handheld renderer, browser input, and an injected save store. Keep browser storage and frame lifecycle outside the domain reducers.

## Scope

- In scope: one contiguous gatehouse scene; an opening dock-worker warning and open-ended investigation objective; scales −2 through +1; directional movement; growth and shrinking; deterministic crisis stages; deliberate waits; slow guaranteed Anchor recovery at one charge per 15 in-game minutes; a first irreversible relief-gate branch whose damaged gate floods the lower drainage settlement at surge; one 20.32 cm rat encounter at scales −2 and −1 with fight, bypass, and size-dependent fates; complete-run save, import, export, and reset; a 160 × 144 standalone handheld page.
- Out of scope: a general combat engine, additional enemies, people and ferry choices, repair and evacuation interactions, physically simulated fluid dynamics, later campaign scenes, and scales outside the four authored bands.

## Actors and Interfaces

- Primary actor(s): Mara Venn, one authored gatehouse rat, and a dock worker with one opening callout.
- Inputs: arrows or directional pad; A grows unless the rat is in reach, when it fights; B shrinks; X waits 15 in-game minutes unless the rat is in reach, when it bypasses; Y saves; save utility controls.
- Outputs: pixel-art frame, current scale/Anchor/crisis HUD, a normalized deterministic tide gauge, persistent geometry damage, the derived gate/drainage outcome and render-only surge floodwater, the rat's persistent fate, and versioned run saves.
- The shared Mosslight frame includes a deterministic screen-space tide gauge: fill follows elapsed crisis game time, capped at the authored aftermath boundary, and color follows the current crisis stage.

## Assumptions and Constraints

- Assumptions: the current Broken Gate geometry and scale-space reducers are canonical for this slice.
- Constraints: gate and flood outcomes derive only from saved geometry damage and the deterministic crisis stage; the flooded patch is a visual consequence, not collision geometry or a fluid simulation. The opening callout and investigation goal appear only before the first timed action; game time advances only from explicit simulation actions; waits after aftermath may restore Anchor but do not advance the crisis stage; a matched-scale fight repels the rat while fighting one rung larger kills it; fighting does not recover Anchor; rendering keeps Mara's sprite at handheld size; all new toy folders retain the four required docs.

## Dependencies

- Internal dependencies: THREEFOLD simulation, crisis clock, scene, renderer and save codec; Mosslight page presenter, pixel renderer and input adapters.
- External dependencies: browser canvas, localStorage when available, and the existing Dadeto build pipeline.
