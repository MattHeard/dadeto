# Add button handler boundary

- Unexpected hurdle: Full `npm run check` first found two core coverage fixtures that still expected `setupAddButton` to construct its own callback.
- Diagnosis: The setup helper now only wires the composed callback, but tests still treated row state and rendering as its inputs.
- Fix: Updated those fixtures to pass a handler explicitly; the empty-row case now checks row creation and render behavior through the public callback factory.
- Next time: When narrowing a setup helper's responsibility, search coverage-only tests as well as focused unit suites for old argument shapes.
- Evidence: `npm run test:unit -- --runTestsByPath ...` passed 7 suites / 38 tests. `npm run check` passed all 10 gates; its unit coverage shards and 11 local E2E tests passed. Full log: `.tmp/npm-check-setup-add-button.log`.
