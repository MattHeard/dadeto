# Threefold NPC headpiece follow-up

- Unexpected hurdle: prior color, halo, pointer, and badge treatments still did not let the playtester distinguish residents from Mara at handheld scale.
- Diagnosis path: `personSprite()` used the shared Mosslight character art for both roles; the small cap was only one 2px row and the `NPC` label depended on reading tiny text.
- Chosen fix: replace the one-row cap with a four-row magenta headpiece and pale inset directly above each resident, preserving Mara's cyan identity and the residents' physical scale response. Add rendered-shape assertions for geometry, grid alignment, attachment, and absence on Mara.
- Evidence: `npm run test:impact -- --files test/core/browser/game/threefold-renderer.test.js` passed 1 suite / 44 tests; elevated `npm run check` passed 7,641 tests in six shards and all 10 static gates; `npm run build` and `git diff --check` passed.
- Next guidance: verify the exact-head deployed Broken Gate on a phone-sized viewport with a screenshot, focusing on whether the NPC headpiece reads immediately without relying on its label. Keep `dadeto-pajf` open until that visual acceptance and CI are verified.
