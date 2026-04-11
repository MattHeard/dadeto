# JoyCon Mapping structure squash

- Surviving mutants addressed: the presenter-rendering cluster around `createFallbackMapping()` and the rendered node literals in `src/core/browser/presenters/joyConMapping.js`.
- Diagnosis: the current presenter tests already proved the visible text for the title, summary, and control values, but they did not assert the DOM class names or the empty text-node class slots that some of the surviving mutants were mutating. That made the report look worse than the real user-visible behavior: the output text was stable, but the presenter contract for structure and node metadata was under-specified.
- Chosen fix: tightened `test/presenters/joyConMapping.test.js` to assert the title and summary class names plus the empty class-name slots on the first rendered control row. This gives the presenter a stronger structural contract without changing the source implementation.
- Validation: full `npm test` passed after the assertions were added.
- Takeaway: when a presenter mutant survives because the visible text is already covered, inspect whether the test is missing the structural DOM contract. Add assertions for class names, node shape, or explicit fallback labels before reaching for a source refactor.

