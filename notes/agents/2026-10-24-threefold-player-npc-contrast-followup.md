# Threefold player and NPC contrast follow-up

- Unexpected hurdle: residents and Mara were both rendered with the same small Mara bitmap, and the earlier scale-only cue did not make their roles legible.
- Diagnosis: at the handheld's tiny sprite footprint, color and silhouette differences alone are easy to miss.
- Fix: add persistent `YOU` and `NPC` badges with distinct gold/cyan backgrounds, keep the badges on the existing 8-pixel grid, and give resident clothing a cyan accent. Add a renderer regression for role text, colors, and grid alignment.
- Next time: evaluate character-role readability in the complete 160 × 144 frame, not only sprite bounds.
