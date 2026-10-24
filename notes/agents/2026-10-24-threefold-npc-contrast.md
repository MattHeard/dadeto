# Threefold NPC contrast

- Unexpected hurdle: players still could not tell residents from Mara even with different colors, a cyan cap, role tags, and Mara's gold pointer.
- Diagnosis: the resident's 2px cyan outline was too thin against the busy 160×144 scene when viewed on a phone.
- Fix: widen the NPC outline to a two-cell cyan halo while retaining Mara's thin gold edge and downward pointer; add a renderer assertion for the halo footprint.
- Next time: judge role markers at the actual handheld size, since color and tiny labels can disappear when the canvas is scaled down.
