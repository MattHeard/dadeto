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

## Evidence

- `node scripts/run-jest.js test/core/browser/game/threefold-renderer.test.js --runInBand --coverage=false` — PASS, 1 suite / 52 tests.
- Local SVG preview rendered at 4×: `/tmp/threefold-frame.png`; the resident's wide magenta cap is clearly distinct from Mara's hood and mantle.
- Initial `npm run check` isolated one lint failure: the added inline assertion pushed the renderer test over its function-length limit. Moved the cap comparison into a shared test helper; focused ESLint and Jest now pass.
- `DADETO_CHECK_PROGRESS_INTERVAL_MS=3000 npm run check` — PASS, check summary reported all 10 gates passed with zero failures.
- `npm run build` — PASS.
- `git diff --check` — PASS.

## Next-time guidance

When character identity feedback persists after role labels ship, inspect the
final rendered 160 × 144 frame. Readable labels do not guarantee that the
characters themselves have distinct silhouettes.
