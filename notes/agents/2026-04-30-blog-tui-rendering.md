# 2026-04-30 Blog TUI rendering

## Unexpected hurdle

The blog generator already emitted key/value rows, so the risky part was not
HTML structure. It was preserving the existing generator snapshots while moving
the page toward a stricter terminal grid.

## Diagnosis path

I inspected `src/build/generator.js`, `src/build/styles.js`, and the generator
tests. Existing media markup already places images inside `.value` containers
and videos inside `p.value`, so CSS containment could satisfy the grid-aligned
media requirement without broad snapshot churn.

## Chosen fix

`src/build/styles.js` now defines terminal cell variables, an 80-column
container, monospace key/value rows, TUI-styled form controls, and media
containment for image, audio, and iframe values. `public/index.html` was
regenerated with `npm run generate`. `test/generator/styles.constant.test.js`
now checks the TUI control styling and character-grid media rules.

## Evidence

- `node --experimental-vm-modules ./node_modules/.bin/jest test/generator/styles.constant.test.js --watchman=false` passed.
- `npm run generate` passed and rewrote `public/index.html`.
- `npm test` passed: 494 suites, 2505 tests.
- `npx eslint src/build/styles.js test/generator/styles.constant.test.js --no-color` passed.

`npm run lint` still reports pre-existing project-wide parsing errors in
generated `infra/cloud-functions/*/common-core.js` files and complexity
warnings under `src/core/cloud`. Those are outside this change and are already
covered by the open quality bead `dadeto-gi73`.

## Next-time guidance

If the CSS-only media containment is not precise enough in browsers that matter,
the next slice should add explicit media wrapper classes in `src/build/generator.js`
and update the exact HTML generator snapshots in the same commit.
