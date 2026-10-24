# Threefold NPC and player visibility

- **Unexpected hurdle:** A pale sprite outline technically identified residents but remained too subtle at the 160×144 display size; the user still could not distinguish NPCs from Mara.
- **Diagnosis:** All person sprites share the same 12px Mosslight source art and compress into 2px cells. Bounding-box and marker-presence assertions did not establish that the identity cue reads clearly at handheld scale.
- **Fix:** Replace the speech bubble with a cyan-framed, bitmap `NPC` label made from 2px cells. Keep Mara unlabelled and preserve the physical NPC scale and pale sprite outline. Tests verify the visible N/P/C glyphs and the 2px grid.
- **Next-time guidance:** Verify visual identity with a strong semantic cue, not only outline or bounding-box differences. Treat user feedback as the readability evaluator; a present icon is not evidence that its meaning is apparent. Verify actor size, identity cue, and physical cell containment independently.
