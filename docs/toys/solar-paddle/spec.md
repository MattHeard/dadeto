# Toy Spec: Solar Paddle

## Summary
- Toy name: Solar Paddle (`SOLA1`)
- Owner: Dadeto browser toys
- Last updated: 2026-06-28

## Problem Statement
- Provide an original frame-stepped paddle game that persists state across submits and renders entirely through canvas shapes.
- Exercise the existing keyboard-capture input path while keeping room for generic Joy-Con/gamepad-style raw input handling inside the toy.

## Boundary
- Keeps the toy synchronous and one-frame-per-invocation.
- Uses local permanent data for persistence and the existing canvas presenter for rendering.

## Scope
- In scope:
  - Parse optional JSON configuration for canvas and paddle defaults.
  - Persist game state between submits.
  - Move the paddle with held input and trigger launch/pause/reset on rising edges.
  - Resolve paddle, panel, wall, and bottom-exit collisions.
  - Render the scene as a shape-only canvas payload.
- Out of scope:
  - Async timers inside the toy.
  - Multiplayer or networked play.
  - Retained canvas presenter changes.

## Actors and Interfaces
- Primary actor(s): A visitor using the toy as a small solarpunk arcade game.
- Inputs: JSON text with optional canvas, paddle, orb, life, and reset fields.
- Outputs: JSON text consumed by the `canvas-2d` presenter.

## Assumptions and Constraints
- Assumptions:
  - The runtime provides `setLocalPermanentData`.
  - The browser can repeatedly submit the toy when auto-submit is enabled.
- Constraints:
  - The toy must stay deterministic for a given persisted state and input sequence.
  - The presentation must stay copyright-safe and original.

## Dependencies
- Internal dependencies:
  - `src/core/browser/toys/2026-06-28/solarPaddle.js`
  - `src/build/blog.json`
- External dependencies:
  - Browser Canvas 2D context support.
