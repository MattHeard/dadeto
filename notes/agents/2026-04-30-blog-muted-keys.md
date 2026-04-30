# 2026-04-30 Blog muted key labels

## Unexpected hurdle

The first hover selector used the whole article row, so direct visual testing
could make key labels brighten even when the key label itself was not hovered.

## Diagnosis path

I checked the generated CSS and then verified computed browser colors with
Playwright against a local `serve public` instance. The broad `.entry:hover >
.key` selector was too coarse for the requested low-contrast default.

## Chosen fix

`src/build/styles.js` now defines `--terminal-key-muted` with `color-mix` and
uses it for `.key` by default. Direct hover on non-title key labels restores the
bright terminal key color via `.key:not(.article-title):hover`.

## Evidence

- `npm run generate` passed and regenerated `public/index.html`.
- Focused style test passed:
  `node --experimental-vm-modules ./node_modules/.bin/jest test/generator/styles.constant.test.js --watchman=false`.
- Playwright computed-color check passed: default key color was muted and direct
  key hover changed the computed color.
- `npm test` passed: 494 suites, 2507 tests.

## Next-time guidance

For hover styling on the generated blog, prefer direct element hover checks over
article-level selectors unless the HTML is changed to wrap each key/value row.
