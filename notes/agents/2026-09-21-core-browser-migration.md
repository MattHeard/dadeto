# Browser core relocation follow-up

- **Surprise:** After moving `src/core/*` directories under `src/core/browser`, imports inside the modules still referenced the old relative layout (e.g., `../constants/selectors.js`). Jest immediately failed with missing module errors, highlighting how deeply the original paths were baked into the code.
- **Investigation:** I traced the failing imports by running `rg` against the renamed folders and by letting Jest point out the first unresolved module. The hardest cases were the toys: they hop between `src/core`, `src/browser`, and nested date folders. Mapping the new relative paths took a careful count of `../` segments for each depth.
- **Resolution:** I updated every impacted import (handlers, presenters, toys, and tests) to the new `core/browser/...` structure and regenerated the build outputs. Running `npm test` after each round confirmed nothing else was broken.

**Next time:** Automate the relative-path adjustments for large moves—either via a codemod or a scripted path map—to avoid the manual backtracking when Jest starts yelling.
