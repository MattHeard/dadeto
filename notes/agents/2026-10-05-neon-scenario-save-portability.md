# Neon scenario save portability

- Unexpected hurdle: scenario menu launches and successful rules routes were covered, but only one scenario had an explicit runtime export/import round trip; the acceptance contract requires completed objectives and results to survive portable saves.
- Diagnosis: inspected `neonScenarios.test.js`; the canonical runtime already preserves the scenario record, but successful clinic, autonomy and brownout routes did not each exercise that boundary.
- Fix: after each real-rule successful route, export the completed campaign, replace runtime state, import the exported save, and assert the full scenario record, save validation, and byte-identical re-export.
- Evidence: focused Jest `npx jest --runInBand --coverage=false test/core/browser/game/neonScenarios.test.js` passed 5/5. Focused local Playwright menu launches passed 12/12 on phone/desktop and standalone/embedded. `TMPDIR=/home/matt/dadeto/.tmp/neon-runtime DADETO_COVERAGE_SHARD_SIZE=40 npm run check` passed all 10 gates; global lines 21761/21761, statements 22756/22756, functions 7419/7419, branches 11594/11594, skipped 0; strict clones 0. `npm run build:cloud`, Prettier and `git diff --check` passed.
- Next-time guidance: treat save portability as part of each short campaign's actual completion route, not only as a generic schema test or a test of one scenario.
