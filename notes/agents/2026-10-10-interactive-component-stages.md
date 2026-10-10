# Interactive component initializer stages

- Unexpected hurdle: moving the dependency stages first left the existing initializer JSDoc attached to the new internal factory; lint identified the mismatch before the full check.
- Diagnosis: the initializer combines a stable runtime configuration with per-article setup. Its seven config fields made the function's effective arity nine, while the public call already used a stable config object.
- Fix: split the internal initializer into two four-dependency capture stages and a final `(article, processingFunction)` operation. Keep the public `initializeInteractiveComponent(article, processingFunction, config)` interface intact and forward config fields explicitly through the stages.
- Evidence: focused Jest passed 8 suites / 80 tests. Fresh no-cache arity scan removed this finding; `toys.js` now has 2 findings. `npm run lint`, `npm run tsdoc:check`, and `git diff --check` passed. `npm run check` passed all 10 gates; coverage is 100% for branches/functions/lines/statements, local E2E 11/11, 0 clones, and 0 vulnerabilities. Full check log: `.tmp/npm-check-interactive-component-stages.log`.
- Next time: continue with the next fresh `toys.js` finding, `initializeVisibleComponents`.
