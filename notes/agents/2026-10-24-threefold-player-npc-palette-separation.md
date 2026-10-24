# Threefold player and NPC palette separation

- Unexpected hurdle: the gold YOU outline, pointer, and labels still did not distinguish Mara clearly enough from residents during play.
- Diagnosis: the actual character pixels still overlapped visually: resident sprites used a gold cap while Mara's source sprite was mostly orange, so small sprites shared warm accents despite different role badges.
- Fix: reserve gold/cream body pixels for Mara and switch resident cap accents to cyan; retain the gold YOU and cyan NPC frames as secondary cues. Add renderer assertions for disjoint role palettes.
- Next time: validate identity at native 160x144 scale, where labels become tiny, and use the sprite body palette as the primary cue.
