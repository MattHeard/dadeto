# Threefold NPC canvas rendering

- **Unexpected hurdle:** NPC-specific art, colors, and role badges existed in the prepared Threefold frame, but the player could still see generic Mosslight sprites.
- **Diagnosis:** Threefold already built complete `frame.shapes`; the shared `drawGameFrame` discarded those shapes and reconstructed scenery with the default Mosslight sprite renderer.
- **Fix:** Threefold frames now draw their prepared shapes directly. A canvas-level regression checks the NPC cyan marker is painted, not merely present in the frame model.
- **Next time:** Trace the final canvas draw path when model-level sprite tests pass but the live screen still looks generic. Keep generic Mosslight composition unchanged.
