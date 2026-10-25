# Threefold player beacon

- Unexpected hurdle: the gold-cloak palette and small role plaques still did not give the player a sufficiently glanceable identity.
- Diagnosis: at a 160x144 display and changing actor scale, clothing color and a readable `YOU` plaque are easy to miss. Keep the player's physical sprite and NPC sizing unchanged.
- Fix: add a fixed-size, grid-snapped cyan and ivory arrow beacon next to Mara; place it above her when there is room and below her near the top edge. The `YOU` plaque and distinct NPC treatment remain in place.
- Verification: focused renderer and menu Jest suites passed 69/69; focused ESLint passed. Full `npm run check` is running with elevated access after sandbox EPERM/network failures.
- Next-time guidance: verify player identity cues at the logical 160x144 screen size, including positions near display edges; assert marker grid alignment and actor role metadata.
