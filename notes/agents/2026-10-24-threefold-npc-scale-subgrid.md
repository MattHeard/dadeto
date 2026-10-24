# Threefold NPC scale visibility

- Unexpected hurdle: the Broken Gate watchkeeper looked the same size when Mara moved from scale 0 to +1, despite the renderer deriving sprite size from physical bounds.
- Diagnosis: the watchkeeper's 0.4 m height produced a scale ratio below the 1/3 minimum at both rungs. Quantizing every sprite cell to 8 px then collapsed both silhouettes to one 8×8 block.
- Fix: use a 2 px sprite subgrid aligned inside the 8 px world grid, and allow the rendered scale down to 1/12. A direct renderer-function reproduction changed the watchkeeper from 2×4 px at scale 0 to 2×2 px at scale +1. Added a regression that checks those bounds and 2 px alignment.
- Validation note: the targeted Jest case passed in a sparse current-main checkout with a temporary parseJsonOrNull stand-in because unrelated validation dependencies were not checked out. This is focused behavior evidence only; npm run check and exact-head CI remain outstanding.
- Next time: compare adjacent scale rungs for the smallest authored NPCs, not only human-scale versus several rungs smaller, and retain the explicit spriteGridSize contract in grid assertions.
