# Local Server Thin Launcher

- Bead: dadeto-6wr7
- Change: moved the local writer request/transport helpers into `src/core/local/server.js` and kept `src/local/server.js` as a small launcher.
- Unexpected hurdle: the refactor initially passed the focused local-server tests but left a tiny branch-coverage gap in `src/core/local/run.js`.
- Diagnosis: the missing branch was the logger fallback path inside `resolveLogger`, which full coverage only exposed after the first `npm test` run completed.
- Fix: added a runtime test that exercises the built-in console logger fallback, then reran the full suite and the non-core-thin gate.
- Evidence: `npm test` passed with 547 suites and 2823 tests; `npm run non-core-thin` now reports 31 non-core violations, 74 wrapper violations, and 0 stale exemptions, with `src/local/server.js` no longer listed.
- Next time: when a launcher refactor touches runtime wiring, include one test for the injected dependency path and one for the fallback path so branch coverage does not drift.

- Latest non-core-thin gate: 30 non-core violations, 74 wrapper violations, and 0 stale exemptions after the Notion Codex launcher split.
