# Threefold NPC readability follow-up — 2026-10-24

- Unexpected hurdle: the resident silhouette and labels had already been strengthened, but the player still reported that residents blended into Mara at handheld size.
- Diagnosis: the earlier brim and headpiece remained too close in width to the 12px sprite at the 2px display scale; color and small role text were insufficient.
- Fix: widened the resident's hat and coat pixels, expanded the attached magenta crest to 32px, and retained Mara's cyan hood and player pointer. The actor's sprite body remains tied to physical scale; the role marks remain grid-aligned.
- Evidence: `npm run test:impact -- --files test/core/browser/game/threefold-renderer.test.js` passed 45 tests; `npm run check` passed all 10 gates and 7,642 tests; `npm run build`, `npm run manuals:check` (84 manuals), and `git diff --check` passed.
- Open question: inspect a real deployed 160×144 capture at phone size. The full check on the prior commit failed the global coverage threshold and produced no screenshot; this local pass is not full-coverage evidence.
