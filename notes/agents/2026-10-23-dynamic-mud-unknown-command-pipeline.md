# Dynamic MUD unknown-command pipeline

- Unexpected hurdle: fast coverage exposed missing branches around empty input, invalid worlds, dry-run failure, and registered-command lookup; the full local check then caught a mismatch between interpreter and adapter result types.
- Diagnosis: scoped impact evaluation gave exact uncovered branches, and `npm run check` gave the TypeScript error for the differing result unions.
- Chosen fix: centralize JSON-safe copying in the DSL module, cover the rejection branches, preserve serialized execution, and make the adapter accept both interpreter and generated-command outcomes.
- Next-time guidance: keep generated providers injected and deterministic in tests. The live model connection still needs a separate default-off, budgeted integration; no provider call was made in this loop.
