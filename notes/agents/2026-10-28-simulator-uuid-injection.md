# Simulator UUID and derived randomness — 28 October 2026

Owning Bead `dadeto-rjmo`, child of Rank11 / `dadeto-e1oz`.

## Change

The native simulator platform now requires `randomUUID(permission)`. Core has no
native UUID import or fallback. New unsuppressed portable `randomness.js` binds the
valid startup permission for the simulator lifetime and supplies the existing
no-argument SDK callback contracts. It never forges or mints permission in core.
This is lifetime-scoped authorization, not a claim of fresh per-request UUID tokens.
The native outer boundary still owns permission creation.

The UUID provider is lazy and supplies each requested UUID afresh. Random sources
use the canonical UUID first field as32 bits divided by0xffffffff, exactly matching
the old native UUID first-eight-hex-digit calculation. Selecting that field removes
redundant global hyphen stripping and an equivalent slice8/9 mutation: parseInt
stops at the canonical ninth-character hyphen. No arbitrary untrusted UUID parser
is introduced; canonical UUID generation is the required provider contract.

Render, statistics, story/page submission, author creation, processing and test
utility compositions receive the derived callbacks. Author repeat tests prove the
first request calls the explicit provider once with lifetime permission and the
second returns the stored UUID. Native crypto is mocked in provider tests.

## Hurdles and diagnosis

Initial red import fails for the absent helper, `/tmp/dadeto-rjmo-red.log`.
The initial26-suite173-test group and compiler pass. Lint catches effective arities
7/5 after expanding configuration. Preserve existing runtime identity aliases;
extract the coherent permission-first fetch-port composition to retain the existing
statement cap, and pass the existing lookupHelpers interface instead of flattening
its two callbacks into page configuration. No rule suppression or parameter escape.

## Evidence

- Focused: `node --experimental-vm-modules node_modules/jest/bin/jest.js
  --runInBand --coverage=false test/core/local/gcp-simulator
  test/local/gcp-simulator test/scripts/gcp-test-workflow.test.js
  test/scripts/playwright-entrypoint.test.js`:26 suites /173 tests PASS21.707s;
  `/tmp/dadeto-rjmo-focused-final.log`.
- Scoped: `TMPDIR=/home/matt/.cache/dadeto-task-tmp/playwright-runner npm run
  check:impact:run -- --files src/core/local/gcp-simulator/randomness.js
  src/core/local/gcp-simulator/simulator.js`:9 suites /50 tests PASS,
  both core sources0uncovered lines/branches, lint/core-parse/zero clones;
  `/tmp/dadeto-rjmo-impact.log`.
- `npm run check -- --skip-tests`:all11 static gates PASS, including concrete
  UUID implementation/provider/token/compiler requirements; `/tmp/dadeto-rjmo-static.log`.
- `npm run build`, `npm run build:cloud`, `npm run verify:cloud-packages`:PASS,
  27 packages /713 modules /1,234 imports; `/tmp/dadeto-rjmo-{build,cloud-build,closure}.log`.
- Entire randomness module: `TMPDIR=/home/matt/.cache/dadeto-task-tmp/playwright-runner
  node --experimental-vm-modules ./node_modules/.bin/stryker run
  docs/quality/simulator-randomness.stryker.config.mjs`:PASS100%,7/7 Killed,
  static enabled (none generated),0survivors/errors/timeouts/ignored/uncovered.
  `reports/mutation/simulator-randomness{,-summary}.json` exactly match source
  SHA-256 `49bba61fd7f281ab4452bbb3139aeabda623959e7f4c8564368afe59f961f997`;
  `/tmp/dadeto-rjmo-mutation.log`. No timeout budget or threshold changes/skips.
- Fresh Babel AST static import/export census:0modules /0Node imports in src/core,
  `reports/mutation/logic-builtins-remaining.json`. This does not cover ambient or
  dynamic effects and is not the observable dependency-rule acceptance.

Original whole-simulator mutation directive, ambient clocks/console, existing
value assertions/broad API types, observable native prohibition, trusted parsing
and namespace migration remain parent prerequisites. No new exclusions. Local/
scoped evidence is not full-suite/global coverage; exact pushed Full Check is
required before closure. No actual local Playwright/provider/production request
or deployment. Existing simulator tests retain temporary local storage/HTTP.

## Next time

Keep the provider permission-first at the shell/core boundary. Where a legacy SDK
requires no-argument callbacks, explicitly bind a real permission with documented
lifetime scope. Test laziness, provider errors, exact fractions and repeated
resource lookups; a changed import alone does not prove correct capability wiring.

## Final CI receipt

Exact0b52f7fd15e7b06b67e936d0611b68eab59f7845 passed Full Check40767918736,
artifact12850613700. Downloaded report
`/tmp/dadeto-full-check-40767918736/full-check-40767918736/coverage/check-full-report.md`
confirms1,091 suites /8,430 tests pass, all four global and both changed core
coverage metrics100%, no files below thresholds. Child `dadeto-rjmo` closes with
this exact pushed revision plus the matching local/7-of-7 mutation acceptance.
