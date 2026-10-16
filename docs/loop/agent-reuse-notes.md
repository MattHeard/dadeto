# Agent reuse notes

After completing a toy or feature, append one JSON object per task to
`notes/agents/reuse-events.jsonl`. The format is append-only: correct an entry
by adding a superseding record with the same `taskId`, not by rewriting history.
The aggregate uses the latest valid record for each task.

Each record uses schema version 1 and contains:

- `taskId` and `feature`: the task identifier and short feature name.
- `reusedModules`: repository-relative paths (optionally `#export`) for
  components that supplied part of the feature.
- `consideredButRejected`: `{ "modulePath", "reason" }` entries for concrete
  reuse attempts that were not used.
- `integrationFriction`: `{ "category", "modulePath", "detail" }` entries.
  Categories are `discoverability` (a suitable component existed but was hard
  to find), `api` (the component was found but difficult to compose), and
  `missing-capability` (no suitable reusable component was found).
- `newModules`: repository-relative paths for modules created by the task.
- `reuseEstimate`: `{ "fraction", "rationale" }`. Use a number from 0 to 1
  only when the feature's required capabilities and supplied capabilities can
  be described; otherwise use `null` and explain why. This is a subjective
  signal, not a line-count metric or a target to maximize.
- `sourceNote`: a path to the contemporaneous task note or other evidence.

Copy this starter record and fill only evidence you can support:

```json
{"schemaVersion":1,"taskId":"","feature":"","reusedModules":[],"consideredButRejected":[],"integrationFriction":[],"newModules":[],"reuseEstimate":{"fraction":null,"rationale":"unknown"},"sourceNote":""}
```

Completion prompt: Which existing modules supplied part of the feature? Which
concrete reuse attempts did not work, and why? Was the friction discoverability,
composition/API, or a missing capability? Which modules were added? Can the
share of required capabilities supplied by reuse be estimated with a short
evidence-based explanation, or should it remain unknown?

Do not infer reuse from similar names or claim an attempted reuse without
evidence. An empty `consideredButRejected` or `integrationFriction` list is
valid. When no suitable component exists, say so as `missing-capability`; do
not describe that as discoverability or API friction.

Run `npm run agents:reuse-report` to validate the JSONL entries and print
counts by friction category with links to the source notes. Pass a different
JSONL path as the first argument when validating a temporary file.
