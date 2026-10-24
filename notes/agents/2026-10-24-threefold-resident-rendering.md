# Threefold resident rendering coverage

- Unexpected hurdle: a named Belltops resident looked like a generic object instead of an NPC.
- Diagnosis: `PERSON_ACTOR_IDS` duplicated some campaign resident IDs manually and omitted `belltops-sera`, so that actor bypassed the NPC sprite, cyan palette, and role badge.
- Fix: build the person-rendering ID set from `RETURN_TIDE_PEOPLE`, retaining only the additional Broken Gate and Belltops characters as explicit entries.
- Next-time guidance: when adding a campaign resident, use the canonical `RETURN_TIDE_PEOPLE` list so the Threefold renderer automatically applies NPC presentation.
