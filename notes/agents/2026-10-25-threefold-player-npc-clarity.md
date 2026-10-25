# Threefold player and NPC clarity

## Hurdle

The player and residents already had different colors, role badges, and source
masks, but the player's cyan cloak was drawn as two sparse side stripes. At
160 × 144 this left both bodies reading as small humanoids.

## Diagnosis and fix

Replaced Mara's disconnected side accents with a connected cyan cloak wedge
that widens from 12 to 24 pixels over four 2-pixel rows. Residents retain the
wide flat cap and straight robe. The cloak is display-only; simulation and
collision bounds are unchanged. Marked cloak cells separately in the rendered
frame so tests can verify their contiguous rows and widening silhouette even
when colors and role labels are ignored.

## Evidence

- Native 160 × 144 actor-mask preview: `/tmp/threefold-characters.png`.
- `node scripts/run-jest.js test/core/browser/game/threefold-renderer.test.js --runInBand --coverage=false` — PASS, 52 tests.
- `npx eslint src/core/browser/game/threefold/renderer.js test/core/browser/game/threefold-renderer.test.js` — PASS, no warnings.
- `npm run build` — PASS.
- `DADETO_CHECK_PROGRESS_INTERVAL_MS=3000 npm run check` — PASS, all 10 gates. The first restricted run failed because Node subprocess spawn returned `EPERM` and `npm audit` could not access the network; the elevated rerun passed.

## Next-time guidance

If role colors and labels still do not help players identify Mara at handheld
size, inspect body-only masks at native resolution and make the player silhouette
structurally different instead of adding more badges.

## Latest play-feedback adjustment

The player still read as separate from her `YOU` marker during play, despite
the now-distinct gold player and magenta NPC silhouettes. The previous layout
favored a side plaque. Mara's `YOU` plaque now prefers a larger, centered
position directly above her, with a short vertical gold connector. NPC `NPC`
plaques retain their magenta treatment. The native frame regression asserts
the centered alignment, connector, safe bounds, and separation from the NPC
plaque. This remains presentation-only.

- Native 160 × 144 frame preview: `/tmp/threefold-player-label-current.png`.
- Renderer Jest: `node scripts/run-jest.js test/core/browser/game/threefold-renderer.test.js --runInBand --coverage=false` — PASS, 52/52.
- `npx eslint src/core/browser/game/threefold/renderer.js test/core/browser/game/threefold-renderer.test.js` — PASS.
- `npm run build` — PASS.
- `DADETO_CHECK_PROGRESS_INTERVAL_MS=3000 npm run check` — PASS, all 10 gates. The sandbox attempt was retried with host permissions after child processes failed with `EPERM`.

## Latest silhouette revision

Fresh play feedback still could not distinguish residents from the player, so
I checked the rendered frame at native resolution and found the compact 4-cell
actor masks were too abstract. Residents now use a broad flat-cap and straight
robe shape; Mara uses a pointed hood, widening cloak, and separate feet. At
normal human scenes, resident source art is also wider than Mara's narrow
silhouette. These are renderer-only changes on the existing 2px grid; world
positions, physical dimensions, simulation, and collision behavior are
unchanged. A first compact-mask attempt collapsed to the same mask in the
Threadbound regression, so I reduced it to deliberately contrasting 4×4
patterns and reran the test.

- Native 160 × 144 preview: `.tmp/threefold-npc-audit/threefold-updated-native.png`.
- `node --experimental-vm-modules ./node_modules/jest/bin/jest.js --runInBand --runTestsByPath test/core/browser/game/threefold-renderer.test.js --no-watchman` — PASS, 52/52.
- `npm run build` — PASS.
- `npm run check` — FAIL (8/10 gates pass). `lint` and `non-core-thin` report warnings/shape violations in the in-progress `src/local/interpretability/atlasResearchJourney.js` and `atlasResearchStorage.js`; these files are outside this Threefold patch and remain part of the active Atlas cleanup.

## Explicit PLAYER label revision

Fresh play feedback still could not tell Mara from the Threefold residents. The compact `YOU` badge was too ambiguous at phone size, so Mara now carries an explicit `PLAYER` badge; compact scenes widen that plaque to 48 pixels and the main player plaque to 54 pixels. Residents keep their bright magenta `NPC` badges. The gold player palette was retained because earlier cyan art blended into the green/teal scenery. No actor positions, scale, collision, or simulation behavior changed. Focused Threefold renderer Jest passes 52/52; a new production phone capture remains necessary for device-level confirmation.

## Oversize controlled-character pointer

Fresh feedback says the gold player sprite and magenta resident sprites still
blend together at a glance. The previous 18px pointer was too small to anchor
Mara on the handheld display. Enlarged it to a 22 × 26px arrow, added an ivory
edge, and kept its point attached to Mara whether it appears above or below her.
The renderer regression checks its dimensions, 2px grid, attachment, and role
metadata. This is display-only; NPC scale and simulation/collision bounds do
not change. A new production-size visual review is still required.
