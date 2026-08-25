# Firebase app manager mutation scan

- Unexpected hurdle: the internal state object is a fixed manager contract rather than independently observable data.
- Diagnosis: the focused scan killed 20 mutants; two state-shape mutations were equivalent at the public helper boundary.
- Fix: documented the narrow state-shape boundary; existing initialization, reset, duplicate-init, context, and optional-app assertions cover behavior.
- Next time: distinguish internal state-shape mutants from initialization behavior in manager modules.
