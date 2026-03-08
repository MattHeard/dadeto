# 2026-03-08: add operator recommendation to Symphony status

- Bead: `dadeto-5sq9`
- Scope: make the local Symphony status surface tell a human operator what to do next for `ready`, `idle`, and `blocked` states.
- Change:
  - added `operatorRecommendation` to the tracker selection summary in `src/core/local/symphony.js`
  - persisted that field through `src/local/symphony/bootstrap.js` and `src/local/symphony/statusStore.js`
  - updated `test/core/local/symphony.test.js` and `test/local/symphony.test.js` to cover ready, idle, and blocked recommendations
- Validation:
  - `npm test` passed with `467` suites and `2303` tests
- Follow-up:
  - the separate root-endpoint bead can expose this same recommendation in the outer HTTP/status response without recomputing the message
