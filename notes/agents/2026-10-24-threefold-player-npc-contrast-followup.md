# Threefold player and NPC contrast follow-up

- Unexpected hurdle: residents and Mara shared the same tiny source bitmap; gold/cyan role labels were present but still did not make the character silhouettes distinct enough.
- Diagnosis: at handheld scale, labels and outline pixels were too small to compensate for identical human art.
- Fix: give every resident a broad-cap, bright-cyan Mosslight sprite while Mara retains her hooded player sprite. Keep the existing gold YOU and cyan NPC badges and verify resident palette pixels in the renderer regression.
- Next time: review the complete 160 × 144 frame and compare role silhouettes at the smallest rendered scale, not only marker metadata.
