# Render variant output decomposition

- **Unexpected hurdle:** None; the existing render-variant integration suite already covers the produced HTML and downstream publication flow.
- **Diagnosis:** `buildRenderOutput` combined HTML template mapping, output file naming, open-option detection, and reverse-link assembly in one destructured parameter bag.
- **Chosen fix:** Delegate HTML construction, file-path construction, and open-option detection to focused helpers; keep reverse-link creation at the output boundary. The returned render plan fields and values remain unchanged.
- **Next-time guidance:** For render-plan work, inspect the two remaining findings in the fresh scan first. `buildRenderPlan` is the next target and can be split around planning data and metadata lookup inputs.
- **Evidence:** Focused Jest passed (1 suite, 107 tests). Fresh no-cache scan reduced `render-variant-core.js` from 3 findings to 2, with no new findings. Scoped ESLint `--max-warnings=0`, `npm run tsdoc:check`, and `git diff --check` passed. `npm run check` passed all 10 gates, including full coverage, 11/11 local E2E, 0 clones, and 0 vulnerabilities. `npm run build:cloud` passed. Logs: `.tmp/npm-check-render-variant-build-render-output.log` and `.tmp/build-cloud-render-variant-build-render-output.log`.
