# Threefold NPC and player visibility

- **Unexpected hurdle:** A pale sprite outline technically identified residents but remained too subtle at the 160×144 display size; the user still could not distinguish NPCs from Mara.
- **Diagnosis:** All person sprites share the same 12px Mosslight source art and compress into 2px cells. Bounding-box and marker-presence assertions did not establish that the identity cue reads clearly at handheld scale.
- **Fix:** Keep the pale silhouette outline and add a high-contrast cyan speech-bubble badge above every visible NPC sprite. The controlled Mara sprite stays unmarked; badge pixels carry NPC identity metadata and remain aligned to the 2px subgrid. Update cell-containment checks to exclude identity badges, which are intentionally outside the actor's physical cell.
- **Next-time guidance:** Verify visual identity with a strong semantic cue, not only outline or bounding-box differences. Inspect marker placement at viewport edges and keep size, identity, and physical cell assertions separate.
