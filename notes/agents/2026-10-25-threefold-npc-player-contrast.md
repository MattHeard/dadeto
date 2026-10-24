# Threefold NPC and player sprite contrast

- Unexpected hurdle: The scene already had magenta NPC halos and tags plus a cyan player label, but the player body itself shared the cool palette of the water and scenery. The added labels had not made the character identity clear enough in play.
- Diagnosis: At 160x144 the actor masks occupy few pixels; color coding and external role tags compete with the water palette and are easy to miss.
- Fix: Added a gold hood crest and sash directly to Mara's pixel mask. NPCs retain their magenta/violet headpiece and body palette, so the warm gold identifier is present only on the player sprite. Kept the existing player/NPC role tags and scale behavior.
- Evidence: Focused renderer suite passed 1 suite / 51 tests. The regression verifies gold appears on Mara and not the Broken Gate resident. `DADETO_CHECK_PROGRESS_INTERVAL_MS=3000 npm run check` passed all 10 gates after an elevated retry; initial restricted run hit environment EPERM during nested Node spawn and registry access failure during npm audit. Spec-cache refresh and `git diff --check` passed.
- Next: Ask for the next playtest observation if the new in-game visual distinction still needs adjustment; continue Rank 2's global Full Check branch coverage work.
