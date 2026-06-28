# Toy Spec: Battery Breakout

## Summary
- Toy name: Battery Breakout (`BATT4`)
- Owner: Dadeto browser toys
- Last updated: 2026-06-28

## Problem Statement
- Provide an original frame-stepped battery-balancing toy that persists state across submits and renders entirely through canvas shapes.
- Reuse the SOLA1 arcade pattern while making charge balancing the core mechanic instead of simple panel clearing.

## Boundary
- Keeps the toy synchronous and one-frame-per-invocation.
- Uses local permanent data for persistence and the existing canvas presenter for rendering.

## Scope
- In scope:
  - Parse optional JSON configuration for canvas and paddle defaults.
  - Persist game state between submits.
  - Move the paddle with held input and trigger launch/pause/reset on rising edges.
  - Resolve paddle, wall, battery-cell, win, and lose conditions.
  - Render the scene as a shape-only canvas payload.
- Out of scope:
  - Async timers inside the toy.
  - Multiplayer or networked play.
  - Retained canvas presenter changes.

## Actors and Interfaces
- Primary actor(s): A visitor using the toy as a small energy-balancing arcade game.
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
  - `src/core/browser/toys/2026-06-28/batteryBreakout.js`
  - `src/build/blog.json`
- External dependencies:
  - Browser Canvas 2D context support.
