# JoyCon storage helper mutation slice

- Unexpected hurdle: the first assertion set expected valid stored mappings to be discarded, which failed the focused Jest test.
- Diagnosis path: a bounded Stryker run over `joyConMapper.js:794-825` found 7 survivors, then 1 survivor after the first test revision.
- Chosen fix: exported the storage parsing helpers for focused tests and asserted malformed input, storage exceptions, nullish input, valid mapping preservation, and absent `localStorage` fallback behavior.
- Evidence: the final bounded Stryker run killed all 8/8 mutants; focused Jest passed 34 tests; targeted ESLint passed with `--max-warnings=0`; `git diff --check` passed.
- Next-time guidance: keep storage/error-handling mutation scans bounded and run with one worker to control memory use.
