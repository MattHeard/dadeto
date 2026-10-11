# Shared special input arity cleanup

- Unexpected hurdle: the sandbox prevented subprocess creation during the first full check (`EPERM`); rerunning with reviewed elevated permissions worked.
- Diagnosis: `reuseOrInsertSpecialInput` accepted a flat configuration object containing placement dependencies plus optional existing-element and creation behavior. This hid five effective inputs behind one parameter.
- Fix: separated the cohesive placement context from the optional existing element and factory, and passed the placement context directly through the ensure and ensurer paths.
- Evidence: `TMPDIR=/home/matt/dadeto/.tmp npm run check` passed all 10 gates, including 11 local end-to-end tests; the no-suppression parameter-bag lint inventory dropped from 29 findings across 29 files to 28 across 28 files. Artifact: `.tmp/parameter-bag-global-after-shared-special-input.json`.
- Next time: start with `src/core/browser/main.js:79` (`createMainHandle`, effective arity 6) and decompose its setup inputs without suppressions or deeper parameter bags.
