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

- In scope: one contiguous gatehouse scene; an opening dock-worker warning and open-ended investigation objective; scales −2 through +1; directional movement; growth and shrinking; deterministic crisis stages; deliberate waits; slow guaranteed Anchor recovery at one charge per 15 in-game minutes; direct passenger evacuation at the ferry mooring, a Latchfolk warning in the lower settlement, and deliberate withdrawal by the upland road, with deterministic and independent outcomes; a first irreversible relief-gate branch whose damaged gate floods the lower drainage settlement at surge; complete-run save, import, export, and reset; a 160 × 144 standalone handheld page.
- Out of scope: autonomous individual passenger/NPC schedules beyond the warning-triggered Latchfolk departure, combat, gate repair and other settlement evacuation interactions, post-storm report filing or departure epilogues, physically simulated fluid dynamics, later campaign scenes, and scales outside the four authored bands.

## Actors and Interfaces

- Primary actor(s): Mara Venn; the dock worker has one opening callout, while the Latchfolk watchkeeper is an authored interaction target whose warning determines whether the settlement reaches higher ground.
- Inputs: arrows or directional pad, A to grow, B to shrink, E or gamepad left shoulder or the touch interaction button to warn the watchkeeper, evacuate passengers at the ferry, or withdraw through the upland road, X to wait 15 in-game minutes, Y to save, and save utility controls.
- Outputs: pixel-art frame, current scale/Anchor/crisis HUD, a normalized deterministic tide gauge, persistent geometry damage, independent passenger/ferry and Latchfolk outcomes, a persistent withdrawal outcome, the derived gate/drainage outcome and render-only surge floodwater, and versioned run saves.
- The shared Mosslight frame includes a deterministic screen-space tide gauge: fill follows elapsed crisis game time, capped at the authored aftermath boundary, and color follows the current crisis stage.

## Assumptions and Constraints

- Assumptions: the current Broken Gate geometry and scale-space reducers are canonical for this slice; ferry work evacuates passengers and warning the watchkeeper sends the Latchfolk toward higher ground.
- Constraints: gate and flood outcomes derive from saved geometry damage and deterministic crisis time; ferry rescue and the Latchfolk warning require an in-range interaction begun before surge; at surge the ferry is lost, passengers still aboard are lost, warned Latchfolk are safe, and unwarned Latchfolk are lost. An in-range upland-road interaction records withdrawal, advances the unattended crisis to aftermath, and prevents later world actions; passenger and warning outcomes already earned still resolve independently. The flooded patch is a visual consequence, not collision geometry or a fluid simulation. The opening callout and investigation goal appear only before the first timed action; game time advances only from explicit simulation actions; waits after aftermath may restore Anchor but do not advance the crisis stage; rendering keeps Mara's sprite at handheld size; all new toy folders retain the four required docs.

## Dependencies

- Internal dependencies: THREEFOLD simulation, crisis clock, scene, renderer and save codec; Mosslight page presenter, pixel renderer and input adapters.
- External dependencies: browser canvas, localStorage when available, and the existing Dadeto build pipeline.
