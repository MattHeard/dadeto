# Directory Shared Core Next Trial Target

- bead: `dadeto-dfqg`
- run id: `2026-03-18T08:20:41.717Z--dadeto-dfqg`
- hypothesis: `src/core/browser/toys` is the next useful directory-shared-core trial target because it already has a directory-named shared module (`browserToysCore.js`) and still contains toy-specific helper files, so a trial there can test whether the shared core stays coherent or starts to become a junk drawer.
- chosen target: `src/core/browser/toys`
- evidence check on 2026-03-18: `rg --files src/core/browser/toys` showed both `browserToysCore.js` and many toy-specific files, and `rg -n "browserToysCore|helpers|shared|utils" src/core/browser/toys` showed multiple imports pointing at the shared core plus local helper files like `toys-core.js` and `objectUtils.js`.
- acceptance evidence: `bd` comment recording the loop contract and target choice, plus this note file.
- evaluator basis: `docs/quality/definition-of-done.md` and `docs/quality/evaluator-matrix.md`
- stop condition: do not widen scope into implementation; if this target turns out not to have a real shared-helper decision, close the bead as stale and open a new bead for the next candidate instead.
