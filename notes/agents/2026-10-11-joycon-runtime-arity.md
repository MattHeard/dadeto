# Joy-Con runtime initializer arity cleanup

- Unexpected hurdle: the initial focused command included a nonexistent `joyConMapper.runtime.test.js`; the mapper runtime is covered in the helper suite and browser handler suite.
- Diagnosis: Joy-Con runtime setup consumes three concepts: DOM elements, mapper lifecycle state/cleanup, and action controls. Existing tests already verify event registration, polling, render, and disposal.
- Fix: `initializeJoyConMapperRuntime` now receives those three records separately; the handler shell and runtime test construct the groups explicitly.
- Evidence: scoped no-cache arity report `.tmp/joycon-arity-after.json` is empty; focused helper and browser handler suites passed (2 suites, 102 tests); TSDoc and lint passed; elevated `TMPDIR=/home/matt/dadeto/.tmp npm run check` passed all 10 gates with 0 failures, 0 clones, and 0 audit vulnerabilities. Fresh global report `.tmp/parameter-bag-global-after-joycon.json` reports 32 findings across 32 files, down from 33/33.
- Next time: locate the repository's actual focused suite before launching Jest. Next target is `src/core/browser/inputHandlers/keyboardCapture.js:119`.
