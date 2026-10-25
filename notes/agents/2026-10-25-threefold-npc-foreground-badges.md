# Threefold NPC foreground badges

- Hurdle: follow-up play feedback still could not distinguish residents from Mara after the magenta palette and badge changes.
- Diagnosis: NPC emblems were emitted alongside world sprites and could be covered by later scene layers; the flat badge also had no dark edge against bright terrain.
- Fix: move NPC emblem shapes to the foreground identity layer and add a two-pixel dark frame around the magenta badge. Update the player guide and acceptance history.
- Evidence: `git diff --check` passed. Focused renderer tests, a phone-size capture, and a build were not run.
- Next: run the focused renderer test and capture the deployed 160 × 144 game screen to verify badge placement and player/NPC distinction.
