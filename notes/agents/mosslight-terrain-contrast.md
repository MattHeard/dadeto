# Mosslight terrain tile contrast

- **Unexpected hurdle:** The embedded preview draws tile colors from the same palettes as the full page, so improving only the page CSS would leave the screenshot's low-contrast terrain unchanged.
- **Diagnosis:** `renderer.js` alternates palette entries 1 and 2 for walkable terrain across all four regions.
- **Fix:** Increase the luminance separation of those terrain pairs and add a renderer regression check requiring at least 3:1 contrast in each map palette.
- **Next time:** For visual feedback on pixel-art tiles, inspect the shared canvas palette and frame payload before changing presentation-only styles.
