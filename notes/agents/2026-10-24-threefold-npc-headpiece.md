# Threefold NPC headpiece follow-up

- Unexpected hurdle: prior color, halo, pointer, and badge treatments still did not let the playtester distinguish residents from Mara at handheld scale.
- Diagnosis path: `personSprite()` used the shared Mosslight character art for both roles; the small cap was only one 2px row and the `NPC` label depended on reading tiny text.
- Chosen fix: replace the one-row cap with a four-row magenta headpiece and pale inset directly above each resident, preserving Mara's cyan identity and the residents' physical scale response. Add rendered-shape assertions for geometry, grid alignment, attachment, and absence on Mara.
- Evidence: `npm run test:impact -- --files test/core/browser/game/threefold-renderer.test.js` passed 1 suite / 44 tests; elevated `npm run check` passed 7,641 tests in six shards and all 10 static gates; `npm run build` and `git diff --check` passed.
- Added a mobile Playwright smoke assertion that the same 160×144 frame contains both Mara cyan and resident magenta; CI must execute it and produce the screenshot artifact.
- The follow-up play report still could not identify NPCs. Replaced shared human pixel art with a distinct wide-brim hat and long-coat resident mask; a renderer regression compares body masks independent of fill colors. Focused renderer Jest now passes 45/45. Keep live phone-size acceptance open until the Full Check screenshot is available.
- Next guidance: inspect the exact-head 320×568 screenshot, focusing on whether the NPC headpiece reads immediately without relying on its label. Keep `dadeto-pajf` open until that visual acceptance and CI are verified.
