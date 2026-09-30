# Toy Spec — Mosslight Valley: The Sleeping Valley

## Summary

- Toy name: Mosslight Valley: The Sleeping Valley
- Owner: Dadeto
- Last updated: 2026-09-30

## Problem Statement

- Deliver an original, replayable handheld-style RPG chapter inside Dadeto and as a dedicated page.

## Boundary

- One deterministic simulation powers both the synchronous canvas toy adapter and the full-screen browser presenter.

## Scope

- In scope: connected maps, schedules, dialogue, quests, farming, fishing, crafting, combat, endings, local saves, and input/rendering adapters.
- Out of scope: network accounts, cloud saves, multiplayer, and chapter authoring UI.

## Actors and Interfaces

- Primary actor(s): player, valley residents, creatures.
- Inputs: keyboard-capture action events, gamepad, touch controls, save import.
- Outputs: 160×144 canvas frame, local save slots, exportable JSON.

## Assumptions and Constraints

- Assumptions: browser canvas and local storage are available; audio may be unavailable.
- Constraints: embedded adapter is synchronous and uses the same runtime/content/save rules as the full page.

## Dependencies

- Internal dependencies: Dadeto browser toy persistence, local permanent-data adapter, shared Mosslight simulation modules.
- External dependencies: none required.
