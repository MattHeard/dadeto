# Copy log pair refactor

- Hurdle: `buildCopyLogMessage` still carried source and destination as separate parameters, which made the call sites verbose and slightly less explicit.
- Diagnosis: the helper only ever uses the two paths together, and the surrounding copy workflows already pass them around as a natural pair.
- Fix: changed `buildCopyLogMessage` to accept a `sourceDestination` object and updated the blog/copy call sites to pass that pair directly.
- Next-time guidance: when a helper always consumes two values together, prefer a small named object over positional parameters so the API stays clearer and easier to extend.
