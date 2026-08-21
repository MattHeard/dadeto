# `src/core` mutation hardening progress

This ledger tracks current-worktree, per-file mutation evidence for the inventory in `src-core-file-inventory.txt`. A file is complete only when its focused Stryker report has zero non-static mutants with `status: "Survived"`.

| File | Mutants | Non-static survivors | Evidence |
| --- | ---: | ---: | --- |
| `src/core/browser/inputHandlers/captureLifecycleDeps.js` | 2 | 0 | `npm run mutant:all -- --mutate src/core/browser/inputHandlers/captureLifecycleDeps.js --testFiles test/browser/inputHandlers/captureLifecycleDeps.test.js --timeoutMS 60000` |
| `src/core/browser/inputHandlers/fileInputSettings.js` | 4 | 0 | `npm run mutant:all -- --mutate src/core/browser/inputHandlers/fileInputSettings.js --testFiles test/browser/inputHandlers/fileInputSettings.test.js --timeoutMS 60000` |
| `src/core/browser/inputHandlers/browserInputHandlersCore.js` | 27 | 0 | `npm run mutant:all -- --mutate src/core/browser/inputHandlers/browserInputHandlersCore.js --testFiles test/browser/inputHandlersCore.test.js --timeoutMS 60000` |
| `src/core/browser/inputHandlers/captureLifecycleShared.js` | 18 | 0 | `npm run mutant:all -- --mutate src/core/browser/inputHandlers/captureLifecycleShared.js --testFiles test/core/browser/inputHandlers/captureLifecycleShared.mutation.test.js --files 'src/core/browser/inputHandlers/captureLifecycleShared.js,src/core/browser/inputHandlers/captureFormShared.js,test/core/browser/inputHandlers/captureLifecycleShared.mutation.test.js,jest.mutation.config.mjs,jest.config.mjs,package.json' --timeoutMS 30000` |
| `src/core/browser/audio-controls.js` | 40 | 0 | `npm run mutant:all -- --mutate src/core/browser/audio-controls.js --testFiles test/browser/audio-controls.test.js --files 'src/core/browser/audio-controls.js,test/browser/audio-controls.test.js,jest.mutation.config.mjs,jest.config.mjs,package.json' --timeoutMS 30000` |
| `src/core/browser/createSectionSetter.js` | 54 | 0 | `npm run mutant:all -- --mutate src/core/browser/createSectionSetter.js --testFiles test/core/browser/createSectionSetter.mutation.test.js --files 'src/core/browser/createSectionSetter.js,src/core/browser/common.js,src/core/browser/browser-core.js,test/core/browser/createSectionSetter.mutation.test.js,jest.mutation.config.mjs,jest.config.mjs,package.json' --timeoutMS 30000` |
