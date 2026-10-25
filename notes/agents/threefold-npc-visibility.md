# Threefold NPC visibility

- Feedback: role colors, tags and body silhouettes still did not separate compact-scene residents from Mara quickly enough.
- Diagnosis: compact actor art used a four-cell-wide cap, and its role label was silently omitted whenever every candidate overlapped another actor.
- Fix: give NPCs a broad cyan cap above their magenta robe and retain an in-bounds label as a fallback in crowded scenes. Preserve simulation geometry and collision behavior.
- Next time: confirm the result in a fresh phone-size production capture; renderer source and unit assertions do not establish how the live build reads on a phone.
- Follow-up feedback: the plaques still dominated the handheld frame, and the NPC connector could reach Mara's gold selection frame. Reduced the resident badge from 48×24 to 32×16, expanded the player keepout to cover Mara's full sprite, and thinned/raised the connector to keep it off the player frame. The focused renderer suite now checks both normal and larger-resident scales. Focused Jest passed 54/54; source syntax and diff checks passed. A fresh device capture remains the next visual confirmation.

## 2026-10-25 screenshot follow-up

- Unexpected hurdle: earlier role plaques added more text directly over the character than the small display could comfortably support, while captions over the world lacked a consistent backing.
- Diagnosis: inspect the 160×144 renderer layering and the phone capture; the oversized PLAYER plaque occupied more visual area than Mara, and HUD rows had no compact icon language.
- Fix: remove Mara's word plaque, keep her gold/ivory identity with a small gold pixel diamond, retain framed resident emblems, give text dark plates, and add clock/scale/movement/button pixels beside HUD rows.
- Guidance: validate at native 160×144 size and keep tests asserting no player word label, complete text backings, and the icon categories. A fresh live phone capture remains necessary for final device-size confirmation.
