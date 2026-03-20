# Directory Shared Core Target Selection

- bead: `dadeto-ymr2`
- run id: `2026-03-18T14:47:31.973Z--dadeto-ymr2`
- chosen target: `src/core/browser/toys`
- evidence:
  - `rg --files src/core/browser/toys | sed -n '1,40p'` showed both `browserToysCore.js` and many toy-specific files.
  - `rg -n "browserToysCore|helpers|shared|utils" src/core/browser/toys` showed the shared core is already used by multiple toys while local helper files like `toys-core.js` and `objectUtils.js` still exist.
- decision: keep this as the next directory-shared-core trial target because it has enough shared-core pressure to test whether the directory stays coherent or starts to drift into a junk drawer.
- acceptance evidence: this note plus the bead comment recording the loop contract and target choice.
- stop condition: do not widen into implementation in this bead; if the target later looks stale, close the bead and open a new one for the next candidate.
