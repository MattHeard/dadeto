# Poll outcome summary arity cleanup

- Unexpected hurdle: the shared outcome helper accepted a single options object with five independent values, making the actual contract less visible than the callers' existing state and event boundaries.
- Diagnosis: the idle and completed paths independently know their fallback summary and optional summary override; selecting the final summary does not need to happen inside the shared state update.
- Fix: resolve the summary at each outcome path and pass state, inactive-run fields, event, and resolved summary as four explicit inputs.
- Next time: keep fallback selection next to the path that defines the fallback. The next global parameter-bag finding is `src/core/local/run.js:104` (effective arity 6).
