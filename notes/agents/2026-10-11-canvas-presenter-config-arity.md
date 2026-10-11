# Canvas presenter configuration arity cleanup

- Unexpected hurdle: the first focused ESLint command used an incorrect test path; the corrected focused test command passed. The aggregate `npm run check` completed successfully.
- Diagnosis: `createCanvasPresenter` exposed one typed canvas-rendering configuration, but the implementation did not preserve the distinction between its cohesive dimensions/presentation values and individual runtime inputs.
- Fix: retain the named typed public configuration, group dimensions and presentation explicitly, and forward DOM, dimensions, presentation, and draw to a four-input renderer. Update both callers and characterize the typed configuration in presenter and lint-rule tests.
- Evidence: focused presenter/lint tests passed (4 suites, 28 tests); TSDoc passed; no-cache global inventory fell from 27 findings/27 files to 26/26 (`.tmp/parameter-bag-global-after-canvas-presenter.json`); `npm run check` passed all 10 gates with 0 clones and 0 audit vulnerabilities; `npm run build` passed.
- Next time: continue from the fresh global scan. This loop's next finding is in `src/core/browser/presenters/ledgerIngest.js` and should be handled as a separate bounded loop.
