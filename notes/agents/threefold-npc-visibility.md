# Threefold NPC visibility

- Feedback: role colors, tags and body silhouettes still did not separate compact-scene residents from Mara quickly enough.
- Diagnosis: compact actor art used a four-cell-wide cap, and its role label was silently omitted whenever every candidate overlapped another actor.
- Fix: give NPCs a broad cyan cap above their magenta robe and retain an in-bounds label as a fallback in crowded scenes. Preserve simulation geometry and collision behavior.
- Next time: confirm the result in a fresh phone-size production capture; renderer source and unit assertions do not establish how the live build reads on a phone.
