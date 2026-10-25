# Threefold player and NPC silhouettes

## Hurdle

The production-rendered YOU and NPC plaques were already visible and clear of
the character bodies, but the humanoid sprites still looked too alike at the
160 × 144 handheld scale.

## Diagnosis and fix

Serialized the default frame's shapes into a temporary 4× SVG preview. The
labels were legible; the NPC's cap was not broad enough to read as a different
silhouette from Mara's hood. Widened the NPC's flat cap while preserving its
12-row sprite height and all simulation/collision bounds. Added a renderer
regression requiring the NPC top band to occupy at least 16 pixels and exceed
Mara's hood width.

After production feedback that the characters were still hard to tell apart,
the default handheld frame showed the NPC's violet robe was too close in value
to the busy landscape, while Mara's cape read as disconnected side stripes.
Made the NPC's robe vivid magenta and changed Mara's cyan side accents into a
cape that visibly widens toward the hem. Added regression coverage requiring a
substantial cyan player shape and magenta NPC body, with role plaques excluded.
No actor position, scale, collision, or physical bounds changed.

The player reported the characters remained hard to distinguish after this
pass. The cool cyan player palette still competed with the green/teal scene.
Changed Mara's body and player-only cues to warm gold and pale ivory, while
keeping NPCs magenta/violet. Extended renderer assertions to check both sides
of that role contrast; physical and collision behavior remain untouched.
The first gold preview still made the cape read as a broad terrain patch, so
shortened it to a shoulder-length flare and kept the hooded body visible. The
updated `/tmp/threefold-gold-player.png` preview makes the player warm gold and
the capped NPC magenta at native 160 × 144 proportions (shown at 4×).

## Evidence

- `node scripts/run-jest.js test/core/browser/game/threefold-renderer.test.js --runInBand --coverage=false` — PASS, 1 suite / 52 tests.
- Local SVG preview rendered at 4×: `/tmp/threefold-frame.png`; the resident's wide magenta cap is clearly distinct from Mara's hood and mantle.
- Initial `npm run check` isolated one lint failure: the added inline assertion pushed the renderer test over its function-length limit. Moved the cap comparison into a shared test helper; focused ESLint and Jest now pass.
- `DADETO_CHECK_PROGRESS_INTERVAL_MS=3000 npm run check` — PASS, check summary reported all 10 gates passed with zero failures.
- `npm run build` — PASS.
- `git diff --check` — PASS.
- Reopened follow-up: `npx jest test/core/browser/game/threefold-renderer.test.js --runInBand --coverage=false` — PASS, 52 tests; `npx eslint src/core/browser/game/threefold/renderer.js test/core/browser/game/threefold-renderer.test.js` — PASS.
- Follow-up `DADETO_CHECK_PROGRESS_INTERVAL_MS=3000 npm run check` — PASS, all 10 gates, six impact shards; `npm run build` — PASS; `git diff --check` — PASS.
- Updated default-frame preview: `/tmp/threefold-frame-after.png`.
- Follow-up renderer Jest: 1 suite / 52 tests passed after warm-gold palette and shorter cape.
- `DADETO_CHECK_PROGRESS_INTERVAL_MS=3000 npm run check` passed all 10 local gates after an initial sandbox run failed with `EPERM` spawning Node and npm audit network access. Elevated rerun passed all six test shards, lint, core parse, dependency checks, duplication (zero clones), TSDoc, and audit (zero vulnerabilities).
- `npm run build` passed after the renderer update.
- Fresh 4× SVG preview `/tmp/threefold-gold-player.png` was reviewed; production capture remains open until the new build is deployed.

## Next-time guidance

When character identity feedback persists after role labels ship, inspect the
final rendered 160 × 144 frame. Readable labels do not guarantee that the
characters themselves have distinct silhouettes.
