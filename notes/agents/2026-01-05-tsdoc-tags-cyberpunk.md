# tsdoc bead triage

- **Unexpected hurdle:** Re-running `npm run tcr` still hits the `.git/index.lock` permission error after the tests/lint run finishes, so the script cannot complete its built-in commit even though eslint/test pass.
- **Work:** Patched the logs by rerunning `npm run test`, `npm run lint`, and `npm run tcr` per the latest guidance, then created new beads `dadeto-666` (typed DOM helpers for `src/core/browser/tags.js`) and `dadeto-qlq` (story data typing for `toys/2025-03-30/cyberpunkAdventure.js`) to capture the remaining tsdoc failures listed in `tsdoc-check-output.txt`.
- **Next steps:** Let the tsdoc backlog (tags, toys, presenters, etc.) guide the next agent, including re-running `npm run tsdoc:check` once the typing debt is addressed and reattempting `npm run tcr` after the filesystem permits `.git/index.lock` creation.
