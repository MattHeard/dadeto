# ESLint duplicate import cleanup

- **Challenge:** The lint suite flagged `src/node/fs.js` for duplicating the `fs` import when accessing the promise-based helpers.
- **Resolution:** Replaced the second import with a destructuring assignment from the existing default import so both sync and async helpers share the same module instance without triggering the lint rule.
