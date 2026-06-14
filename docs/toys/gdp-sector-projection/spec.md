# Toy Spec: GDP Sector Projection

## Summary
- Toy name: GDP Sector Projection (`GDPS1`)
- Owner: Dadeto browser toys
- Last updated: 2026-06-14

## Problem Statement
- Visualize GDP share trends for the primary, secondary, and tertiary sectors from 2000 through 2025.
- Extend the view with a simple forward projection that drives primary to 0 by 2030, secondary to 0 by 2035, and tertiary to 100 through 2050.

## Boundary
- Pushes the browser toy system into multi-series time-series plotting while keeping the toy itself text-in/text-out.

## Scope
- In scope:
  - Parse yearly sector-share data from JSON.
  - Produce a graph payload with one series per sector.
  - Render the existing trend period and the requested projection horizon.
- Out of scope:
  - Statistical forecasting.
  - Confidence intervals.
  - Interactive editing of the series.

## Actors and Interfaces
- Primary actor(s): A visitor comparing structural economic change over time.
- Inputs: A JSON array of yearly GDP share rows.
- Outputs: A JSON graph payload consumed by the `graph-2d` presenter.

## Assumptions and Constraints
- Assumptions:
  - The input rows are annual and cover the 2000 to 2025 trend window.
  - Shares are percentage values.
- Constraints:
  - The toy stays synchronous.
  - The projection is deterministic and rule-based.

## Dependencies
- Internal dependencies:
  - `src/core/browser/toys/2026-06-14/gdpSectorProjection.js`
  - `src/core/browser/presenters/graphPlot.js`
  - `src/core/browser/graphPlotCore.js`
- External dependencies:
  - Browser Canvas 2D context support.
