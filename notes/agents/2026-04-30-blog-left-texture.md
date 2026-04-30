# 2026-04-30 Blog left alignment and texture

## Unexpected hurdle

The previous terminal styling worked, but the centered container created a
large textured gutter only on the outside of a solid black content block.

## Diagnosis path

The visual check showed `#container` was centered via `margin-inline: auto` and
painted with `background: var(--terminal-bg)`. The body already owned the scanline
texture, so the fix could stay in `src/build/styles.js`.

## Chosen fix

`#container` now uses `margin-inline: 0 auto` and `background: transparent`.
That keeps the 80-column terminal width but pins it to the left edge and lets
the body texture show behind and around the content.

## Evidence

- `npm run generate` passed and regenerated `public/index.html`.
- Focused style test passed:
  `node --experimental-vm-modules ./node_modules/.bin/jest test/generator/styles.constant.test.js --watchman=false`.
- Playwright local visual check against `http://127.0.0.1:4174/` returned:
  container `x: 0`, transparent container background, textured body background,
  and no horizontal overflow.
- `npm test` passed: 494 suites, 2506 tests.

## Next-time guidance

For layout-only blog CSS changes, use the local static-server plus Playwright
metric check before committing. It catches alignment and background issues more
directly than string-only CSS tests.
