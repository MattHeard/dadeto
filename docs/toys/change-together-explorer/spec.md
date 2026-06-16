# Toy Spec: Change Together Explorer

## Summary
- Toy name: Change Together Explorer (`CHAN1`)
- Owner: Dadeto browser toys
- Last updated: 2026-06-15

## Problem Statement
- Show a small, inspectable slice of co-change analysis using a static change-set history.
- Help a maintainer see which files and file pairs move together most often without wiring in repo mining or network access.

## Boundary
- Pushes the toy system into static co-change ranking while staying pure JSON-in / JSON-out.

## Scope
- In scope:
  - Parse a static `changeSets` array from JSON input.
  - Rank file pairs by how often they appear together.
  - Rank individual files by how often they appear and how many partners they have.
  - Return a deterministic JSON report.
  - Render a collapsed, text-only user manual block in the public blog post with show/hide links.
- Out of scope:
  - Live git history analysis.
  - File watching.
  - Database or network-backed mining.

## Actors and Interfaces
- Primary actor(s): A maintainer comparing a small static history of change sets.
- Inputs: JSON with `changeSets`; each change-set record may include `id` and `files`.
- Outputs: JSON with ranked file pairs, ranked files, and summary counts.

## Assumptions and Constraints
- Assumptions:
  - Missing identifiers fall back to stable numbered labels.
  - Missing or invalid file arrays are treated as empty.
- Constraints:
  - Sorting must be deterministic for ties.
  - The toy must remain synchronous and static.

## Dependencies
- Internal dependencies:
  - `src/core/browser/toys/2026-06-15/changeTogetherExplorer.js`
  - `src/build/blog.json`
- External dependencies:
  - None.
