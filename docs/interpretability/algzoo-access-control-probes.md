# AlgZoo access-control probe boundary

The paired pilot runner has an in-process synthetic leakage regression in
`test/core/interpretability/algZooPilotHarness.test.js`. It sends a treatment-only
canary and a future-treatment canary through the real map-filter and paired-runner
boundary, then inspects both investigator requests and the recorded retrieval
access logs. The control request must receive no map entries; the treatment
request may receive only completed findings from earlier pairs. A held-out canary
is passed to the scorer and remains absent from both investigator requests.

Run the focused probe with:

```sh
npm run test:impact -- --files test/core/interpretability/algZooPilotHarness.test.js
```

This proves the repository's in-process boundary for synthetic data. It does not
prove access restrictions in a model provider, remote map service, logging system,
or production credential environment. Before a real assignment, run the frozen
protocol's control-canary and future-canary probes against the configured runtime,
verify the provider and service logs contain no canary or held-out content in an
investigator prompt, and preserve the raw log artifact and its hash in the launch
manifest. Do not treat this unit test as evidence that a real pilot is launch-ready.
