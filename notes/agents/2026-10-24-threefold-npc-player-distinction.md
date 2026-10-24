# Threefold NPC and player visibility

- **Unexpected hurdle:** A pale sprite outline technically identified residents but remained too subtle at the 160×144 display size; the user still could not distinguish NPCs from Mara.
- **Diagnosis:** All person sprites share the same 12px Mosslight source art and compress into 2px cells. Bounding-box and marker-presence assertions did not establish that the identity cue reads clearly at handheld scale.
- **Fix:** Replace the speech bubble with a cyan-framed, bitmap `NPC` label made from 2px cells. Keep Mara unlabelled and preserve the physical NPC scale and pale sprite outline. Tests verify the visible N/P/C glyphs and the 2px grid.
- **Next-time guidance:** Verify visual identity with a strong semantic cue, not only outline or bounding-box differences. Treat user feedback as the readability evaluator; a present icon is not evidence that its meaning is apparent. Verify actor size, identity cue, and physical cell containment independently.

## Follow-up: distinct body silhouette

- **Unexpected hurdle:** The user still could not distinguish residents from Mara after the role tags were deployed.
- **Diagnosis:** Color and text labels were not enough at the handheld's small native display; both actors still read as similarly sized people.
- **Fix:** Give residents a broad brim and a continuous full-length robe. Mara keeps the hooded short jacket and separated-leg silhouette. A frame-level test checks the resident's continuous robe hem, while the existing mask comparison checks color-independent silhouette difference and scale tests preserve physical sizing.
- **Next-time guidance:** A role label can reinforce character identity, but silhouette must carry the distinction on its own at 160 × 144. Keep phone-size production acceptance open until a fresh capture is reviewed.
