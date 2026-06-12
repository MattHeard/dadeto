# Toy Spec: Canvas Doodle

## Summary
- Toy name: Canvas Doodle (`CANV1`)
- Owner: Dadeto browser toys
- Last updated: 2026-06-12

## Problem Statement
- Provide a small, inspectable Canvas experiment that turns JSON input into a few layered 2D shapes.
- Exercise the blog's presenter plumbing with a real `<canvas>` render path instead of a text-only output.

## Boundary
- Pushes the browser toy system into HTML Canvas rendering while keeping the toy itself text-in/text-out.

## Scope
- In scope:
  - Parse a small JSON payload describing canvas size and shape colors.
  - Render a canvas element using the `canvas-2d` presenter.
  - Keep the toy beta-gated so it can be inspected before public release.
- Out of scope:
  - Freehand drawing tools.
  - Pointer events or interactive animation.
  - Permanent storage or network calls.

## Actors and Interfaces
- Primary actor(s): A blog visitor experimenting with Canvas rendering.
- Inputs: A JSON string with optional `width`, `height`, `background`, and `accent` fields.
- Outputs: A JSON string consumed by the `canvas-2d` presenter.

## Assumptions and Constraints
- Assumptions:
  - The runtime provides the standard browser toy env Map.
  - Canvas rendering is supported by the browser presenter path.
- Constraints:
  - The toy must stay synchronous.
  - The blog post should remain hidden behind the beta release gate unless explicitly revealed.

## Dependencies
- Internal dependencies:
  - `src/core/browser/toys/2026-06-12/canvasDoodle.js`
  - `src/core/browser/presenters/canvasDoodle.js`
  - `src/build/blog.json`
  - `src/core/browser/toys.js`
- External dependencies:
  - Browser Canvas 2D context support.
