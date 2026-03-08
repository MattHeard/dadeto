# 2026-03-08: expose operator recommendation at Symphony root surface

- Bead: `dadeto-82el`
- Scope: make the root Symphony HTTP surface show the same operator-facing next-action guidance as `/api/symphony/status`.
- Change:
  - updated `src/local/symphony/app.js` so `/` serves the same JSON status payload as `/api/symphony/status`
  - added `test/local/symphony.app.test.js` to verify both routes expose `state` and `operatorRecommendation`
- Validation:
  - `npm test` passed with `468` suites and `2304` tests
- Follow-up:
  - if Symphony later gets a richer human-facing shell, it can layer on top of the same root route without changing the recommendation source
