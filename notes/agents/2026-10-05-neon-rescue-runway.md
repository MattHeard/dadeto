# Neon Covenant rescue runway checkpoint

Owner: `dadeto-88mh`; Release 4 and the four-release campaign remain in progress.

The financial-distress loop replaces immediate insolvency with a persisted,
two-settlement intervention window. The controller exposes two authored notes,
requires a preview and explicit confirmation, charges one attention, and records
the borrowed amount and shift-28 repayment/ownership consequence. Cash recovery
stabilizes the episode; unresolved negative cash expires the window. Historical
rules-8/9 migration preserves balances and history while advancing the complete
campaign chain to rules 10. The sound menu, GBC-style music, effects, and mute
preference remain covered by the existing audio module and its regression.

Verification before aggregate gate:

- `TMPDIR=/home/matt/dadeto/.tmp/neon-runtime node scripts/run-jest.js --runInBand --coverage --collectCoverageFrom='src/core/browser/game/neon-covenant/**/*.js' --coverageDirectory=.tmp/neon-distress-full-coverage test/core/browser/game/neon*.test.js`: 14 suites, 229 tests, all four coverage metrics 100%.
- `TMPDIR=/home/matt/dadeto/.tmp/neon-runtime npx playwright test --config test/mosslight.playwright.config.ts test/mosslight-e2e/neon-covenant.spec.ts --grep 'emergency runway terms' --workers=1`: 4/4 phone/desktop standalone/embedded journeys.
- `test/core/browser/game/neonAudio.test.js`: passed as part of focused and full Neon suites.
- `TMPDIR=/home/matt/dadeto/.tmp/neon-runtime DADETO_COVERAGE_SHARD_SIZE=40 npm run check`: terminal exit 0; test 1/1 and static checks 10/10 passed. Global coverage: lines 21,563/21,563; statements 22,532/22,532; functions 7,387/7,387; branches 11,389/11,389; zero skipped. Strict unchanged duplication threshold: zero clones.
- `npm run build` (included in aggregate test) and `npm run build:cloud`: passed.
- Final built-game rescue Playwright: `TMPDIR=/home/matt/dadeto/.tmp/neon-runtime npx playwright test --config test/mosslight.playwright.config.ts test/mosslight-e2e/neon-covenant.spec.ts --grep 'emergency runway terms' --workers=1`: 4/4 phone/desktop standalone/embedded journeys.
- `npm run lint`, `npm run tsdoc:check`, `git diff --check`, and the focused 14-suite/229-test Neon run all passed; Neon coverage exactly 100% in all four metrics. Existing audio regression passed in focused and aggregate tests.

Unexpected hurdle: several older migration tests built artificial rules-9 saves
from current rules-10 fixtures, and one forecast assertion still expected
immediate insolvency. The accepted fix was to test the real rules-8 -> 9 -> 10
chain, wrap complete legacy migration paths, and move the insolvency forecast
fixture to the shift-28 confrontation. Keep authored history and financial
values intact; do not weaken migration or rescue-window assertions.

Remaining Release 4 scope includes reversible planning drafts, three short
scenarios, campaign philosophy/ending balance, complete playthrough evidence,
and publication of verified checkpoints.
