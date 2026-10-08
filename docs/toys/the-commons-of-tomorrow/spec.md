# Toy Spec — The Commons of Tomorrow

## Summary

- Toy name: The Commons of Tomorrow
- Owner: Dadeto
- Last updated: 2026-10-08

## Problem Statement

- Deliver a handheld solarpunk RPG chapter about people pursuing different terminal values in a materially post-scarcity city.

## Boundary

- A deterministic Commons simulation powers both a dedicated page and an embedded toy; game identity, rules and local saves remain independent from Mosslight, Neon Covenant and Chronoflow.

## Scope

- In scope: Canopy Commons and the Living Weir; authored NPC schedules and values; exploration; evidence; a branching water-sharing quest with three resolutions; one deterministic water-routing puzzle; selectable horizontal practices; charter consequences; local save slots and import/export.
- Out of scope: combat, accounts, multiplayer, procedural maps, currency economy, trusted-time puzzles, and generated narrative.

## Actors and Interfaces

- Primary actors: Sola, four residents with explicit values and reasons, and the player.
- Inputs: directions and A/B/X/Y through keyboard, gamepad and virtual keypad. A interacts/confirms; X opens/closes menus; Y assigns B; B uses the selected field action and backs out of overlays.
- Outputs: shared pixelated 160×144 frame, connected maps, dialogue, journal, puzzle readout, charter outcome, and versioned local saves with import/export.
- Public game adapters: `createCommonsRuntime(options)` for shared lifecycle/state/save/frame operations and `commonsToy(input, env)` for the synchronous embedded frame contract.

## Assumptions and Constraints

- Material needs are met; meaningful constraints are ecological limits, attention, consent, and incompatible values.
- Consequences are stored as explicit evidence, agreements and world flags; there is no moral alignment or aggregate relationship score.
- Story simulation is deterministic and uses no network clock. Both entry points consume the same runtime.

## Dependencies

- Internal dependencies: Mosslight movement, dialogue, input, pixel canvas presenter, save adapter and page presenter where compatible; Commons-owned tile and sprite generators; Chronoflow deterministic flow solver primitives where compatible.
- External dependencies: none required.
