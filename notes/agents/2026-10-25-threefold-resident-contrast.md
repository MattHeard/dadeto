# Threefold resident contrast follow-up

- Unexpected hurdle: the previous warm player palette and magenta resident badges still did not satisfy the latest play feedback; the Dolt Beads lock also prevented creating or updating a task record.
- Diagnosis: residents and Mara had separate badges and silhouettes, but the cool green/cyan scene reduced their clothing contrast. `npm run check` also surfaced unrelated staged interpretability failures plus sandbox spawn and audit failures.
- Fix: give residents a vivid cyan outline and role badge, cyan/violet clothing, and a brighter violet cap; retain Mara's gold/ivory art. Apply the same role colors in compact region sprites, update renderer assertions and the player guide.
- Evidence: focused Threefold renderer Jest passes 52/52; `npm run build` passes. Full `npm run check` remains failed for the exact environment and unrelated-worktree reasons recorded in `docs/toys/threefold/acceptance.md`.
- Next: once Beads access returns, record this loop on the owning Threefold bead. Review a fresh production phone-size capture; if residents still blend in at native scale, revise the sprite mask or marker placement based on that capture rather than changing simulation or collision.
