# Threefold resident accents at small scales

- Unexpected hurdle: resident colors disappeared after quantizing physically scaled NPC pixels onto the 2px grid.
- Diagnosis: at the authored Broken Gate scale, sampling retained resident sprite cells but none landed on the cyan coat or gold cap palette entries.
- Fix: recolor existing top and lower resident cells as gold and cyan accents; this preserves the NPC silhouette bounds and the player art.
- Next-time guidance: validate role palettes after physical scaling and grid quantization, not only against the source bitmap.
