# 2026-06-15 · conflict-aware product scheduler toy

- Unexpected hurdle: the first pass satisfied the toy behavior, but the repo gates rejected it on branch coverage and a duplication clone that was outside the new toy.
- Diagnosis path: I traced the uncovered lines with `nl` and used the jscpd report to separate toy-specific clones from an existing shared-helper match in `src/core/local/notion-codex/valueHelpers.js`.
- Chosen fix: I added narrow tests for invalid JSON, non-record payloads, primitive fallbacks, and tie-breaking, then reshaped `valueHelpers.js` to avoid the shared clone while keeping behavior unchanged. After that, `npm test`, `npm run check`, and `npm run build` all passed.
- Next-time guidance: when a new toy hits repo-wide hygiene gates, isolate the toy-specific coverage gap first, then only touch shared helpers if the clone report proves the blocker is outside the toy slice.
