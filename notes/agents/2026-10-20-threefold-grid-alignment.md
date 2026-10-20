# THREEFOLD grid alignment

- Unexpected hurdle: snapping rendered geometry changed the expected tide-meter positions and widths, and invalidated a test that compared rendered wall widths across a physical scale change.
- Diagnosis: canvas quantization intentionally changes displayed bounds while leaving physical simulation values continuous; those assertions mixed the two representations.
- Fix: added a single frame-finalization step that snaps all shape origins and rectangle dimensions to four logical pixels, then rewrote display assertions around the snapped output and kept the physical scale invariant separate. The page controls and spacing now use an eight-pixel grid with rotations removed.
- Next time: when validating pixel-grid rendering, test both scenes, check all emitted shape bounds, and assert simulation state before/after rendering. Keep physical-size expectations on the simulation/projection model rather than rounded screen dimensions.
