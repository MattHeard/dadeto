# Chronoflow tide arity cleanup

- Unexpected hurdle: the first TSDoc run flagged nullable uncertainty as unsafe after `Number.isFinite`; JavaScript's runtime guard did not narrow the declared nullable type.
- Diagnosis: tide-window inputs combined trusted clock state and level requirements; callers already held a trusted reading, but rebuilt a redundant object.
- Fix: `isTideWindowOpen` now accepts a trusted clock record and a separate optional requirements record. It explicitly rejects null/non-number uncertainty and preserves the synchronized status, finite epoch, nonnegative uncertainty, high-tide default, and 120000ms period.
- Evidence: focused Chronoflow tests passed (4 suites, 50 tests); `npm run tsdoc:check` passed; elevated `TMPDIR=/home/matt/dadeto/.tmp npm run check` passed all 10 gates with 0 failures, including 0 clones and 0 audit vulnerabilities. Fresh no-cache global arity inventory `.tmp/parameter-bag-global-after-chronoflow-tide.json` reports 39 findings across 39 files, down from 40/40.
- Next time: preserve domain records across function boundaries and make nullable runtime values explicit in TSDoc types. Next target is `src/core/browser/game/mosslight-valley/tileGenerator.js:14`.
