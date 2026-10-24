# Threefold NPC color separation

- Unexpected hurdle: the cyan halo, cap, and NPC badge still did not let the playtester distinguish NPCs from Mara on the small handheld screen.
- Diagnosis: cyan/teal was too close to the green playfield and resident body colors read too similarly at reduced scale.
- Fix: moved NPC body accents, halo, cap, and badge to a high-contrast violet/magenta palette while keeping Mara's gold/cream palette and pointer. Updated the current manual, acceptance note, and existing renderer assertions.
- Next time: verify character identity at the actual 160 × 144 display size; color separation must survive the surrounding scene palette and scale reduction.
