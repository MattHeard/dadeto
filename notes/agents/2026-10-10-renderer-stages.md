# Key-value renderer stages

- Unexpected hurdle: none. One early transform-cache attempt was affected by `/tmp` being full; the focused retry used repo-local temp and no cache.
- Diagnosis: `createRenderer` unpacked six dependencies from one options object. Rendering naturally separates stable DOM/container/disposer context from row data and synchronization behavior.
- Fix: stage `createRenderer` as `(dom, disposers, container)`, followed by `(rowData, textInput, syncHiddenField)`, and update all direct callers.
- Evidence: focused Jest passed 6 suites / 39 tests. Fresh no-cache arity scan reports no findings in `src/core/browser/toys.js`. `npm run lint`, `npm run tsdoc:check`, and `git diff --check` passed. Full `npm run check` passed all 10 gates; coverage 100% for branches/functions/lines/statements, local E2E 11/11, 0 clones, 0 vulnerabilities. Full check log: `.tmp/npm-check-renderer-stages.log`.
- Next time: refresh the repository-wide arity report and continue at its next highest-value cluster; toys.js is clean.
