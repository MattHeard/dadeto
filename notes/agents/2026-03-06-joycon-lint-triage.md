## Joy-Con lint triage

- Unexpected hurdle: `npm run lint` reports 215 warnings, which looked broad until the report was grouped by file and rule.
- Diagnosis path: inspected `reports/lint/lint.txt`, counted warnings by file and rule, and sampled the three Joy-Con files to distinguish local cleanup from repo-wide policy drift.
- Chosen fix: treat the cluster as three local cleanup beads, not a lint suppression or policy-change task.
- Next-time guidance: start with `reports/lint/lint.txt` aggregation before editing; `src/core/browser/inputHandlers/joyConMapper.js` is the largest slice, while presenter `camelcase` warnings are tied to persisted snake_case keys and should be handled locally rather than by weakening the global rule.
