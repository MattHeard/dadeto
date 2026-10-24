# Threefold player marker remains visible at handheld size

- Unexpected hurdle: the player still could not distinguish Mara from residents after separate palettes, silhouettes, outlines, and text labels had been added.
- Diagnosis: the player-only gold pointer was only three 2px rows, so its shape cue was too small when the 160x144 screen was scaled down on a phone.
- Fix: expanded the pointer into a six-row gold arrow leading from the `YOU` badge to Mara, and added a renderer regression for its size and contact with the sprite.
- Next time: validate role cues at the actual handheld display size; different colors and labels are insufficient evidence of glanceable distinction.
