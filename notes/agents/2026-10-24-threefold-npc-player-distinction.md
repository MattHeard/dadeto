# Threefold NPC and player visibility

- **Unexpected hurdle:** The previous scale work ensured a Broken Gate resident changed raster bounds by scale rung, but that did not make residents visually distinct from Mara at 160×144.
- **Diagnosis:** All person sprites share the same 12px Mira source art and compress into 2px cells. Existing tests covered bounds and grid alignment, not a persistent visual difference from the controlled character. Focused and aggregate checks also exposed stale 8px-only assertions in seven scene tests after person sprites moved to a 2px subgrid.
- **Fix:** Add a pale 2px-grid outline to NPC person sprites only; retain the existing physical scale and leave Mara unmarked. Cover the marker in `test/core/browser/game/threefold-renderer.test.js`, and update scene-grid assertions to honor each sprite's declared grid size.
- **Next-time guidance:** Check both semantic identity (NPC versus controlled player) and physical-size changes in the rendered handheld payload. Do not infer visual legibility from bounding-box differences alone.
