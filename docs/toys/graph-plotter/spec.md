# Toy Spec: Graph Plotter

## Summary
- Toy name: Graph Plotter (`GRPH1`)
- Owner: Dadeto browser toys
- Last updated: 2026-06-13

## Problem Statement
- Provide a small, inspectable graphing toy that plots a single-variable function on Cartesian axes.
- Exercise the browser toy pipeline with a canvas presenter that renders axes, grid lines, and a curve.

## Boundary
- Pushes the browser toy system into function plotting while keeping the toy itself text-in/text-out.

## Scope
- In scope:
  - Parse a small JSON payload describing the function and graph bounds.
  - Render a graph on a canvas using a dedicated `graph-2d` presenter.
  - Keep the toy synchronous.
- Out of scope:
  - Symbolic algebra.
  - Multi-variable functions.
  - Interactive panning/zooming.

## Actors and Interfaces
- Primary actor(s): A blog visitor experimenting with function plots.
- Inputs: A JSON string with `expression`, optional bounds, and color fields.
- Outputs: A JSON string consumed by the `graph-2d` presenter.

## Assumptions and Constraints
- Assumptions:
  - The runtime provides the standard browser toy env Map.
  - Canvas rendering is supported by the browser presenter path.
- Constraints:
  - The toy must stay synchronous.
  - Expressions should stay limited to `x` and `Math`.

## Dependencies
- Internal dependencies:
  - `src/core/browser/toys/2026-06-13/graphPlot.js`
  - `src/core/browser/presenters/graphPlot.js`
  - `src/core/browser/graphPlotCore.js`
  - `src/build/blog.json`
  - `src/core/browser/toys.js`
- External dependencies:
  - Browser Canvas 2D context support.
