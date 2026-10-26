# Supply-chain nowcasting browser loop

- Unexpected hurdle: focused tests invoked directly with `npx jest` fail to parse `import.meta` in this ESM project; the repo wrapper is required. Adding the new catalogue post also changed an existing test's expected number of linked decision tools.
- Diagnosis: use the output from the first direct run, then inspect `package.json` and neighboring tests to identify `node scripts/run-jest.js` as the canonical runner. The catalogue test intentionally selects a fixed set of posts and asserts its count.
- Chosen fix: run focused tests through the wrapper, extend the catalog test to include the supply planner, and add browser presenter tests for defaults, disruption toggle, warning lead, invalid planner output, and listener cleanup.
- Next-time guidance: page presenter code in `src/core` needs full changed-file branch coverage, including disposer paths and nullish fallback branches; make these observable via jsdom tests or narrow dependency seams.
- Open work: export/import, disruption duration, cost/buffer mitigations, optional industry identifiers, scoped Stryker, and human usability evidence remain for Rank 10.
