# `src/core` mutation hardening progress

This ledger tracks current-worktree, per-file mutation evidence for the inventory in `src-core-file-inventory.txt`. A file is complete only when its focused Stryker report has zero non-static mutants with `status: "Survived"`.

| File | Mutants | Non-static survivors | Evidence |
| --- | ---: | ---: | --- |
| `src/core/browser/inputHandlers/captureLifecycleDeps.js` | 2 | 0 | `npm run mutant:all -- --mutate src/core/browser/inputHandlers/captureLifecycleDeps.js --testFiles test/browser/inputHandlers/captureLifecycleDeps.test.js --timeoutMS 60000` |
| `src/core/browser/inputHandlers/fileInputSettings.js` | 4 | 0 | `npm run mutant:all -- --mutate src/core/browser/inputHandlers/fileInputSettings.js --testFiles test/browser/inputHandlers/fileInputSettings.test.js --timeoutMS 60000` |
| `src/core/browser/inputHandlers/browserInputHandlersCore.js` | 27 | 0 | `npm run mutant:all -- --mutate src/core/browser/inputHandlers/browserInputHandlersCore.js --testFiles test/browser/inputHandlersCore.test.js --timeoutMS 60000` |
