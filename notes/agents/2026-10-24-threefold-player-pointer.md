# Threefold player and NPC distinction follow-up

- Unexpected hurdle: distinct sprite colors, outlines, and `YOU`/`NPC` tags still did not let the player identify Mara at a glance.
- Diagnosis: the previous regression checked semantic color/metadata but did not enforce a role cue with a visibly different shape.
- Fix: add a gold downward pointer to Mara's `YOU` badge. NPCs keep square cyan `NPC` badges. A renderer test checks the pointer's 10/6/2-pixel taper and that it carries no NPC marker metadata.
- Next-time guidance: when a user says an identity distinction is not visible, verify shape-level cues in addition to palette and text assertions; do not treat metadata-only distinction as visual acceptance.
