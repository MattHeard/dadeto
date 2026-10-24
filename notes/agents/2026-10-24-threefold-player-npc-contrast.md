# Threefold player and NPC contrast

- Unexpected hurdle: the magenta NPC outline, badge, and diamond still did not make the controlled character obvious during play.
- Diagnosis: Mara's gold treatment shared warm colors with world details, while both roles used small labels above sprites.
- Fix: reserve bright cyan for Mara's coat, outline, badge, and longer attached pointer; preserve magenta/violet for residents and keep the NPC diamond.
- Next-time guidance: judge role distinction at the actual 160 × 144 handheld scale and verify both color and geometric cues in the renderer test.
- Follow-up diagnosis: the default Broken Gate render placed the 46×20 NPC badge at x=82..128, overlapping Mara's sprite cells at x=72..86. The keepout had been calculated around the player's center as if that were the source-art origin. Derive the keepout from the 12px sprite's actual top-left and choose the nearest 2px-grid NPC badge position that avoids the player. Add a full-frame regression for badge/sprite non-overlap and in-screen bounds; shape metadata alone had missed this visual collision.
