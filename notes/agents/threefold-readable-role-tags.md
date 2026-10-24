# Threefold readable character role tags

- Unexpected hurdle: repeated palette, silhouette, halo, and icon adjustments still did not let the player tell Mara from nearby residents during play.
- Diagnosis: the 160×144 screen made small geometric markers ambiguous; marker metadata such as `YOU` and `NPC` was not rendered as text.
- Fix: render real bitmap `YOU` and `NPC` labels in contrasting cyan/dark and magenta/pale combinations, attached to each actor and aligned to the 2px subgrid.
- Next time: inspect the actual canvas output at phone scale and test visible glyphs, not only marker shape metadata. Confirm labels stay clear of actors and the HUD at scene edges.
