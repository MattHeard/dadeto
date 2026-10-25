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
