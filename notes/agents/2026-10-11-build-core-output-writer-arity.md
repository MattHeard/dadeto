# Build core output writer arity cleanup

- Unexpected hurdle: the first extraction removed `writeHtmlOutput`'s parameter bag but increased the lint inventory from 16 findings to 17 by making formatter and fallback helpers expand `options` plus a writer callback.
- Diagnosis: a fresh no-cache lint inventory identified both new findings in `src/core/build/buildCore.js`; passing an unrelated options bag and callback simply relocated the oversized dependency list.
- Chosen fix: prepare separate formatter and permission-bound output-writer closures, then compose them with format/fallback logging in a four-input flow factory. This preserves per-write AllowEffects binding and keeps caller options immutable.
- Evidence: focused Jest passed (1 suite, 4 tests); target ESLint/TSDoc checks passed; global no-cache lint inventory fell from 16 findings/16 files to 15/15 with no `buildCore.js` findings; `TMPDIR=/home/matt/dadeto/.tmp npm run check` passed all 10 gates; `TMPDIR=/home/matt/dadeto/.tmp npm run build` passed; `git diff --check` passed.
- Next-time guidance: verify that decomposition reduces the global inventory before proceeding to expensive gates. Next current finding is `src/core/build/dendrite.js:20` (effective arity 5).
