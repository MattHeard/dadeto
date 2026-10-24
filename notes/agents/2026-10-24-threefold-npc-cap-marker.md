# Threefold NPC silhouette marker follow-up

- Unexpected hurdle: a warm player palette, cool NPC palette, labels, and different outlines still did not make residents unmistakable at handheld size.
- Diagnosis: the characters retained similar silhouettes after the source art was quantized onto the 2px subgrid, so color and small text carried too much of the identity cue.
- Fix: add a bright cyan cap to each scaled resident sprite. The cap stays attached to the sprite, follows its width with a minimum cue size, and remains snapped to the 2px display grid. Mara keeps the hooded gold-and-cream sprite and never receives the NPC cap.
- Next time: inspect identity at native 160x144 before relying on palette or role text; make a role cue part of the silhouette itself.
