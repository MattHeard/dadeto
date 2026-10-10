# Parameter bag rollout: dendrite form handler

- Unexpected hurdle: staging `wireLabelledField` changed its call contract, and a Life Seed test mock still modeled the previous one-call object API. The first focused run exposed that mismatch.
- Diagnosis: five findings were in field-rendering and form-builder orchestration. Two redundant field wrappers were only forwarding the same six-value options record, and the form builder bound the DOM and managed state in one call.
- Fix: removed the forwarding wrappers, staged field assembly and listener wiring, and bound the form builder first to DOM helpers and then to managed form state. Updated the internal Life Seed, Real Hourly Wage, and Blog Key call sites and the mock to use the staged wiring contract.
- Evidence: focused Jest passed (4 suites, 46 tests); scoped ESLint and TSDoc passed; fresh no-cache scan reports zero findings in `createDendriteHandler.js` (`.tmp/parameter-bag-create-dendrite-handler.scan.json`); elevated `npm run check` passed all 10 gates, including 11 local browser e2e tests, with zero clones and zero audit vulnerabilities (`.tmp/npm-check-parameter-bag-create-dendrite-handler.log`).
- Next guidance: retain the split between DOM/form bindings and per-field state. Select the next cluster from the fresh global scan before editing.
