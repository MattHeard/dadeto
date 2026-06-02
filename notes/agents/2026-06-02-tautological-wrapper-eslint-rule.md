# Tautological wrapper ESLint rule

- Hurdle: the first version of the rule was too broad and immediately surfaced a long list of intentional helper wrappers across `src/core`.
- Diagnosis: I traced the warnings through `npm run lint`, then narrowed the rule to entrypoint-style files and added a separate helper test file to cover the AST branches the normal rule test harness could not reach.
- Fix: added `src/core/lint/tautological-wrapper.js`, wired it into `eslint.config.js`, and added focused tests in `test/core/lint/tautological-wrapper.test.js` plus helper coverage in `test/core/lint/tautological-wrapper.helpers.test.js`.
- Guidance: when adding new lint rules in this repo, start with a narrow file scope and add direct helper coverage early so `tsdoc:check` and global coverage do not get surprised later.
