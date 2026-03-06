## joyConMapper helper pass

- Unexpected hurdle: `joyConMapper.js` still mixed shallow helper warnings with deep callback/control-loop warnings, and treating them as one refactor bead made progress hard to measure.
- Diagnosis path: ran file-level eslint before and after a utility/prompt/meta helper pass to separate low-risk reductions from the deeper capture-loop work.
- Chosen fix: keep the helper extraction pass that reduced the file from 31 warnings to 22, then split the remaining capture/handler complexity into its own bead.
- Next-time guidance: `dadeto-gpo2` should focus only on the capture detection callbacks, row-render callback, handler closures, and the remaining `registerClick`/handler-path warnings in `src/core/browser/inputHandlers/joyConMapper.js`.
