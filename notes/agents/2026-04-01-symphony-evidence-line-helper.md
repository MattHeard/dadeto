## Symphony evidence line helper

- **Context:** `jscpd` at 17 was still flagging a pair of `symphony` evidence-line helpers that only differed by their label prefix.
- **Fix:** Extracted `buildRunnerEvidenceLine(prefix, outcome)` and reused it from the blocked/completed evidence helpers so the shared string shape lives in one place.
- **Follow-up:** `symphony` still has other clone groups, but this specific evidence-line match is gone; the remaining frontier is now the cloud-core/commonCore and the remaining `symphony` queue/launch helpers.

**Testing**
1. `npm run duplication`
2. `npm run lint`
3. `npm test`
