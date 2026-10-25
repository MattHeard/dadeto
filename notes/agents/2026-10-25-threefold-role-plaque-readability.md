# Threefold role plaque readability

- Unexpected hurdle: the prior player mantle, cyan beacon, magenta NPC halo, and role plaques still did not let the player distinguish NPCs from Mara during play.
- Diagnosis: the 160x144 frame used tiny 6-8px role text in plaques that were only 22x10 or 28x12 logical pixels. Those cues were too small at handheld scale.
- Fix: enlarge both `YOU` and `NPC` plaques to 34x16 and use 10px bitmap text. Widen Mara's NPC keepout rectangle so the larger NPC plaque cannot overlap her mantle/body. Physical size and collision remain unchanged.
- Evidence: `npx jest test/core/browser/game/threefold-renderer.test.js --runInBand --coverage=false` passed 52/52; `DADETO_CHECK_PROGRESS_INTERVAL_MS=3000 npm run check` passed all 10 gates across six impact shards; `npm run build`, `npm run threefold:spec:refresh:best-effort`, and `git diff --check` passed.
- Next: inspect the deployed handheld frame when available and adjust placement only if the plaques are still not clear in actual play.
