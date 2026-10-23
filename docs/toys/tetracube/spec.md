# Tetracube construction toy

## Summary

- Toy name: Tetracube construction
- Owner: Dadeto game workstream
- Last updated: 2026-10-23
- Source: [Rank 4 Notion specification](https://app.notion.com/p/3fa700afc3018197bf69c704917400f1)

## Problem Statement

Explore spatial construction with indivisible four-voxel pieces. The technical question is whether a bounded, deterministic grid model can support rigid placement, vertical settling, deletion and cascading re-settlement before a playable interaction layer is added.

## Boundary

The domain model stores each piece as a stable identity, a free tetracube shape, an orientation and an integer grid position. Its four occupied cells are derived. Rendering, browser input, random piece selection and page lifecycle belong to later adapters.

## Scope

- In scope for this first loop: enumerate the eight free tetracubes; normalize their unique orientations under the 24 proper cube rotations; project grid cells; reject overlaps without mutating state; calculate rigid downward settling; remove a piece and settle resulting unsupported pieces until stable.
- In scope for the full toy: a first-person flat-world construction page with walking/flying, one offered piece, a camera-following ghost, collision-free landing preview, instant placement, delete-only mining, undo, reset, playtest and follow-up design notes.
- Out of scope: torque, tipping, structural strength, falling animation, player-versus-structure collision, infinite terrain, campaign objectives, resource economy and multiplayer.

## Actors and Interfaces

- Primary actor: one player constructing a tower or bridge from randomly offered tetracubes.
- Inputs: integer positions, valid 3D rotation orientations, piece placement and deletion commands.
- Outputs: canonical shape/orientation data, derived occupied cells, collision/landing results and stable settled structures.

## Assumptions and Constraints

- Each piece has exactly four face-connected unit cells.
- A single voxel contact is enough to support a piece; pieces move only vertically and never rotate while falling.
- Invalid placements leave state unchanged. Settling must finish with no overlapping voxels.
- The first technical loop is pure and deterministic; no new runtime rendering dependency is introduced.

## Dependencies

- Internal dependencies: none for the pure mechanics model.
- External dependencies: none.
