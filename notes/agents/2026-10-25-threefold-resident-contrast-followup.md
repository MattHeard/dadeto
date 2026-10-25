# Threefold resident contrast follow-up

- Hurdle: the earlier cyan NPC accents still blended into the green/teal playfield in user feedback; source documentation also disagreed about the active role palette.
- Diagnosis: the renderer has both authored silhouette differences and role badges, but the latest compact colors used cyan against the scene. The Beads database could not be opened because the shared Dolt lock was busy.
- Fix: restored saturated magenta/violet resident pixels, outline, badge, and compact NPC palette; retained Mara's gold/ivory palette and distinct silhouette. Updated the guide and acceptance record.
- Evidence: focused Threefold renderer Jest passed 52/52; ESLint passed on the changed JavaScript; `npm run build` passed. Production phone-size visual confirmation remains open.
- Next time: inspect a fresh 160x144 phone capture after the build is deployed, and retry recording the loop contract in Beads when the Dolt lock is free.
