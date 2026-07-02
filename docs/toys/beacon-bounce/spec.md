# Toy Spec: Beacon Bounce

## Summary
- Toy name: Beacon Bounce (`BEAC1`)
- Owner: Dadeto browser toys
- Last updated: 2026-07-01

## Problem Statement
- Provide an original frame-stepped paddle toy where the core objective is beacon activation and link formation rather than block clearing.
- Exercise the existing keyboard-capture, mobile-button, and gamepad-style input paths while keeping the toy deterministic and storage-backed.

## Boundary
- Keeps the toy synchronous and one-frame-per-invocation.
- Uses local permanent data for persistence and the existing canvas presenter for rendering.

## Scope
- In scope:
  - Parse optional JSON configuration for canvas and paddle defaults.
  - Persist game state between submits.
  - Move the paddle with held input and trigger launch/pause/reset on rising edges.
  - Resolve wall, paddle, beacon, and bottom-exit collisions.
  - Render the scene as a shape-only canvas payload.
- Out of scope:
  - Async timers inside the toy.
  - Multiplayer or networked play.
  - Retained canvas presenter changes.

## Actors and Interfaces
- Primary actor(s): A visitor using the toy as a small station-network activation game.
- Inputs: JSON text with optional canvas, paddle, orb, life, layout, and reset fields.
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
  - `src/core/browser/toys/2026-07-01/beaconBounce.js`
  - `src/build/blog.json`
- External dependencies:
  - Browser Canvas 2D context support.
