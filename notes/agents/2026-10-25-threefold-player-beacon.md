# Threefold player beacon

- Unexpected hurdle: the gold-cloak palette and small YOU/NPC plaques still did not give the player a sufficiently glanceable identity.
- Diagnosis: at a 160x144 display and changing actor scale, clothing color and a readable YOU plaque are easy to miss. Keep the player's physical sprite and NPC sizing unchanged.
- Fix: add a fixed-size, six-row cyan and ivory arrow beacon that touches Mara's sprite outline and points toward her. Place it above her when there is room, or below her near the top edge. The YOU plaque and distinct NPC treatment remain in place.
- Verification: focused renderer and menu Jest passed 69/69 for the initial beacon; the refined renderer suite passed 52/52. Focused coverage confirms both arrow placements. Focused ESLint passed. Full npm run check is running with elevated access after sandbox EPERM/network failures.
- Next-time guidance: verify player identity cues at the logical 160x144 screen size, including positions near display edges; assert marker direction, grid alignment, body contact, and actor role metadata.
