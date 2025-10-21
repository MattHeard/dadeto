# Move src tests into test tree

Relocated the remaining Jest files from `src/core/**` into the mirrored `test/core/**` structure. The main snag was that their local `./module.js` imports no longer resolved once the files sat outside `src/`, so I rewrote each import to point back to `src/...` using the correct relative depth and re-ran `npm test` to confirm everything still executed. The cleanup ensures the copy step no longer sweeps up test suites into `public/`.
