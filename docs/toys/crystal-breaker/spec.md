# Toy Spec: Crystal Breaker

## Summary
- Toy name: Crystal Breaker (`CRYS1`)
- Owner: DADETO browser toys
- Last updated: 2026-06-28

## Problem Statement
- Exercise the SOLA1/Battery Breakout frame-stepped pattern while adding a first-class text HUD and multi-hit crystal targets.

## Boundary
- Push the canvas-2d presenter to support safe text rendering without breaking rect, circle, and line payloads.

## Scope
- In scope:
- Paddle movement, orb launch, deterministic collisions, crystal hp/fracture/shatter transitions, score/lives/status HUD, persisted bounded state.
- Out of scope:
- Asynchronous timers, copied commercial layouts, sound, bitmap sprites, retained canvas, networked state, multiplayer.

## Actors and Interfaces
- Primary actor(s): single player
- Inputs: keyboard capture and generic gamepad/Joy-Con capture mapped inside the toy
- Outputs: canvas-2d payload with rect, circle, line, and text shapes

## Assumptions and Constraints
- Assumptions: the toy runs in the existing DADETO one-frame submit loop.
- Constraints: state must stay bounded and recover from malformed input or persisted storage.

## Dependencies
- Internal dependencies: `canvasDoodleCore`, browser toy storage helpers, blog key generator workflow
- External dependencies: none
