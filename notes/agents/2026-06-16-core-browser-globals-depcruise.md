# Core browser globals enforcement

- Unexpected hurdle: the new `src/core/scripts/check-depcruise.js` policy helper created a branch-coverage gap even after the functional check passed.
- Diagnosis path: I first wired a browser-global scan for `src/core/browser/main.js`, then ran `npm test` and used the uncovered branch report to isolate the missing `fetch` boundary case.
- Chosen fix: inject `document`, `window`, `fetch`, and `localStorage` from `src/browser/main.js`, and keep a depcruise-backed policy that rejects direct browser-global use in the core browser entry.
- Next-time guidance: when adding a scanner helper, add both a positive and a boundary-negative test up front, especially for end-of-string and punctuation cases.
