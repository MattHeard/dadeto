# Toy Spec — Mosslight Valley: The Sleeping Valley

## Summary

- Toy name: Mosslight Valley: The Sleeping Valley
- Owner: Dadeto
- Last updated: 2026-10-01

## Problem Statement

- Deliver an original, replayable handheld-style RPG chapter inside Dadeto and as a dedicated page.

## Boundary

- One deterministic simulation powers both the synchronous canvas toy adapter and the full-screen browser presenter.

## Scope

- In scope: connected maps, schedules, dialogue, quests, farming, fishing, crafting, combat, endings, local saves, and input/rendering adapters.
- Out of scope: network accounts, cloud saves, multiplayer, and chapter authoring UI.

## Actors and Interfaces

- Primary actor(s): player, valley residents, creatures.
- Inputs: directions and A/B/X/Y only on both virtual keypads, keyboard and gamepad. X opens menus, Y assigns B, and A confirms; B is a saved shortcut and goes back in overlays. All gameplay and save actions are available through menus.
- Outputs: 160×144 canvas frame, local save slots, exportable JSON.
- Terrain art: a deterministic tile generator keeps walkable ground continuous within each region. `scenery.js` supplies outlined, palette-indexed roofs and timber windows, fruit trees, shoreline rocks and carved dungeon stone; the renderer detects roof rows from collision neighbors. Both presenters consume the same generated rectangles.
- Navigation: connected outdoor areas scroll internally; these are not fixed-screen rooms. Directional arrows and destination labels mark edge crossings. The Hollow arch visibly distinguishes a sealed story gate from an open crossing. X → Story and help explains this model.
- Introduction: the persistent opening HUD gives the first task (listen at the well). X → Story and help opens player-paced story, controls and objective pages, introducing Aster's unwritten letter and the valley's borrowed memories. Only the visible overlay handles input.

## Assumptions and Constraints

- Assumptions: browser canvas and local storage are available; audio may be unavailable.
- Constraints: embedded adapter is synchronous and uses the same runtime/content/save rules as the full page.

## Dependencies

- Internal dependencies: Dadeto browser toy persistence, local permanent-data adapter, shared Mosslight simulation modules.
- External dependencies: none required.
