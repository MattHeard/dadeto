# Threefold identity marker alignment

## Retrospective

- Unexpected hurdle: the test assumed Mara's `YOU` badge could only sit above or below the sprite, although collision avoidance can move it to either side.
- Diagnosis: side placement reused the above-sprite y coordinate, leaving its short gold connector detached from Mara's outline.
- Fix: center side badges vertically on Mara and test both valid connector orientations against the sprite bounds.
- Next time: assert the relationship between identity markers and actors without hard-coding one collision-avoidance direction.

## Evidence

- `test/core/browser/game/threefold-renderer.test.js`: 52 tests passed.
- `npm run check`: all 6 impact shards and all 10 static gates passed.
