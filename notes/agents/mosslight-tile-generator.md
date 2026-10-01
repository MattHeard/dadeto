# Mosslight background tile generator

- **Unexpected hurdle:** The first generator still produced the old checkerboard impression because it sometimes used the highlight color as the entire walkable tile fill; its micro-details were too subtle to change the overall read.
- **Diagnosis:** Compared the tile generator and screenshot palette: the `seed % 5` full-tile highlight was the dominant alternating visual, not a missing renderer connection.
- **Fix:** Keep walkable ground on the region's ground color and reserve light/glimmer/shadow for layered, region-specific pixel accents. Add a regression proving continuous tile bases and varied bounded detail geometry.
- **Next time:** Validate the visual hierarchy at the target handheld scale: small detail cannot overcome a high-contrast base pattern. Keep both presenters on the shared generator and test the same geometry they paint.
