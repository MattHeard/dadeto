## Normalizing shared string helpers

I expected to drop the shared helper straight into the submit-new-page module, but a re-export sitting in `src/core/cloud/submit-new-story/cloud-core.js` meant the submit handler already depended on a local shim. That reminded me to add the new helper to the top-level `cloud-core.js` so both submit flows could import it through their existing paths without rewriting every import.

After wiring the helper into the page handler I leaned on the Jest suite as the guardrail. It takes a while to run, yet catching a regression there is far easier than chasing it after deployment, so I started the run before tidying the notes. Next time I’ll kick off the tests even earlier (right after the first refactor) to hide the latency behind doc updates.
