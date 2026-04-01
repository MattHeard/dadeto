# Browser Timer Dom Helpers

- Hurdle: `npm run lint` auto-fixed a handful of unrelated style-only files while I was validating the timer refactor.
- Diagnosis: the remaining browser code still used direct timer globals in the UI shell and auto-submit fallback path, while the shared DOM helper contract lacked `setTimeout` / `clearTimeout`.
- Fix: added timeout helpers to `document.js` and `domHelpers.js`, routed the browser timer call sites through the shared helper bucket, and added an auto-submit fallback test for the timeout path.
- Next time: if lint autofix expands the diff, re-check the final tree before committing so the patch stays scoped to the intended branch-coverage slice.
