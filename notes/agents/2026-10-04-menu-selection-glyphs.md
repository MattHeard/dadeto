# Handheld menu selection markers

Ion's staff conversation also reproduced the reported cropped first line:
its story, current concern and choice controls produced a panel at y=-18.
Staff conversations now paginate the complete prose into four-row pages,
with commitments only on the last page. Existing forecasts retain their
six-row pagination. Reading remains free and never advances the shift.
Already-open older staff conversations are also normalized on save restore,
preserving their text, read position, highlighted choice and ledger. The
portable-save regression verifies no costs replay and a stable round trip.

Focused acceptance: all nine Neon/pixel-art Jest suites pass (153 tests),
with exactly 100% statements, branches, functions and lines on `pixelFont`,
`forecast`, `simulation` and `neonCovenant`. Evidence:
`.tmp/menu-marker-focused-release.log` and `reports/menu-marker-coverage/`.
Run the browser regressions with:

```sh
CI=1 TMPDIR=/home/matt/dadeto/.tmp/neon-runtime npx playwright test --config test/mosslight.playwright.config.ts test/mosslight-e2e/menu-markers.spec.ts --workers=1
```

The expanded browser run also covers existing Neon campaigns, Mosslight
dialogue and journal ownership. Evidence: `.tmp/menu-marker-browser-release.log`.
Keep browser and full coverage runs serial on this constrained machine.
`/tmp` is full; use the named repository-local temporary directory for Jest,
Playwright and the aggregate check instead of deleting unrelated files.

The initial browser check accidentally reused a stale agent-owned server.
Its pixel assertions correctly rejected the old font. Stop the identified
stale server and use `CI=1` for this isolated harness to require a fresh build.
Desktop standalone input must use keyboard controls; its touch buttons are
intentionally hidden. Embedded directional buttons use `ArrowDown`, not
`down`, in their `data-key` attribute.

The missing-arrow report reproduced in the shared bitmap font: ASCII `>`
used by Mosslight menus and Neon's first-shift lesson fell back to `?`.
The separate `›` glyph used by regular Neon menus and dialogue choices was
drawn pointing left. Both now have the same original right-pointing pixels.

Exact pixel assertions in `mosslightPixelArt.test.js` cover both spellings.
`menu-markers.spec.ts` checks actual canvas pixels after controller input,
including selection movement, in both games' standalone and embedded menus
on desktop and phone. It also rejects browser errors and viewport overflow.

When adding a menu symbol, verify its bitmap exists rather than assuming a
browser font will supply it. The shared presenter deliberately uses a fixed
bitmap alphabet, not native text rasterization. Quality-gate evidence is
recorded on `dadeto-88mh`; the larger relationship redesign remains separate.
