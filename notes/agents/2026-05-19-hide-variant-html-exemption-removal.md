Unexpected hurdle: the first few `npm run check` passes were blocked by `jscpd` duplicates in `src/core/local/documentStore.js`, not by the cloud launcher itself.

Diagnosis path: I compared the repeated blocks around workflow persistence and active-index updates, then used the duplication report to narrow the repeats to a couple of tiny helper-shaped chunks.

Chosen fix: I extracted shared helpers for trailing-draft detection, active-index updates, and workflow persistence so the wrappers stayed thin and the clone detector stopped flagging the same logic twice.

Next-time guidance: when a migration looks done but duplication still fails, move the shared persistence path first and keep the public entrypoints as one-line adapters.
