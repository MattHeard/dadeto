# Threefold high-contrast player silhouette

- Unexpected hurdle: The cyan player body plus a small gold crest/sash remained too subtle after prior NPC/player markers and palette changes.
- Diagnosis: Cyan shares the game's bright water palette, so Mara's body did not separate strongly enough from nearby resident sprites on the small handheld display.
- Fix: Recolored most of Mara's cloak to warm gold while retaining the cyan collar, cyan player-only outline, and YOU marker. NPCs retain their magenta/violet bodies and labels; physical scale and projection remain unchanged.
- Evidence: Focused renderer Jest passed 51/51. Body-mask assertions verify Mara has more gold pixels than cyan and the Broken Gate resident has no gold. Elevated `DADETO_CHECK_PROGRESS_INTERVAL_MS=3000 npm run check` passed all 10 local gates across six impact shards. Spec-cache refresh and `git diff --check` passed.
- Next: Inspect latest phone-size view after deployment feedback; continue separate global coverage work under Bead dadeto-3jh8.
