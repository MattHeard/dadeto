# Symphony renderer arity cleanup

- Unexpected hurdle: the first full check ran inside the restricted process sandbox and could not spawn Node child processes (`EPERM`); its test and core-parse results were invalid. The reviewed elevated rerun completed normally.
- Diagnosis: fresh inventory had two findings in `src/core/local/symphony/tuiRenderer.js`, where section rendering and backlog rendering unpacked five fields from single options objects.
- Fix: make output lines, available slots, and status explicit inputs; retain only the cohesive section content and queue/layout context as records. Update focused test utility calls to the new helper contracts.
- Evidence: focused renderer suites passed (3 suites, 10 tests); target no-cache arity scan is empty; elevated `npm run check` passed all 10 checks, including tests, core parsing, audit, TSDoc, and zero duplication clones. Fresh global inventory is 46 findings across 44 files. Artifact: `.tmp/parameter-bag-global-after-tui-renderer.json`.
- Next time: continue the parameter-bag rollout in `src/core/scripts/check-duplication.js`, which currently has two findings.
