# Toy Spec: Conway Life

## Summary
- Toy name: Conway Life (`CONW1`)
- Owner: Dadeto browser toys
- Last updated: 2026-06-22

## Problem Statement
- Provide a small Game of Life engine that persists its board and tick speed in local storage.
- Exercise the browser's auto-submit loop and the canvas-2d presenter with a stateful, frame-stepped toy.

## Boundary
- Keeps the toy synchronous and text-in/text-out.
- Uses local storage for state persistence and the existing canvas presenter for rendering.

## Scope
- In scope:
  - Parse optional JSON configuration for dimensions, tick speed, and optional seed cells.
  - Persist board state in local storage across submits.
  - Advance the board once per auto-submit frame when the checkbox is enabled.
  - Render the board as a canvas payload.
- Out of scope:
  - Pointer editing of cells.
  - Async timers inside the toy.
  - Multiplayer or networked simulation.

## Actors and Interfaces
- Primary actor(s): A blog visitor watching a Life board advance frame by frame.
- Inputs: A JSON string with optional `width`, `height`, `cols`, `rows`, `tickSpeedMs`, `cells`, and `reset`.
- Outputs: A JSON string consumed by the `canvas-2d` presenter.

## Assumptions and Constraints
- Assumptions:
  - The runtime provides `setLocalPermanentData`.
  - The browser auto-submit loop is enabled for frame stepping.
- Constraints:
  - The toy must remain synchronous.
  - State must survive page refreshes through local storage.

## Dependencies
- Internal dependencies:
  - `src/core/browser/toys/2026-06-22/conwayLife.js`
  - `src/core/browser/toys.js`
  - `src/build/blog.json`
- External dependencies:
  - Browser Canvas 2D context support.
