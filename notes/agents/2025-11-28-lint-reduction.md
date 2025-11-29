## Unexpected hurdle
- `npm run lint` produces 140+ warnings, most coming from complexity/gating helpers sprinkled across the cloud modules and the e2e upload script; the initial challenge was choosing a subset we could fix safely without touching dozens of other files.

## How I addressed it
- Focused on the `get-moderation-variant` path: simplified the Firestore/auth guards, split the UID resolution flow (`buildDecodedUidResult` + helpers) to keep cyclomatic complexity under the 2‑limit, and routed token responses through small helpers so the linter saw only single-branch functions.
- Added a pair of helpers around the `upload-report` script to isolate directory recursion, error logging, and logging payloads so the complexity warning went away and the new functions could be documented.
- Split `resolveCreditValue` so the numeric guard lives in its own helper, and added JSDoc comments for every new utility so the JSdoc rules stay happy.
- Restructured `generate-stats-core.js`: split `getTopStories`/`buildTopStoryFromStatsDoc`, normalized CDN/URL lookups via helper collection logic, added response validation utilities, and documented the new helpers so the rule set no longer flagged them. This brought the total lint warnings down from 170 to 141 while keeping feature behavior unchanged.
- Verified the full suite (`npm run lint` and `npm test`), confirming the refactors didn’t regress behavior or coverage.

## Lessons learned & follow-ups
- Small, purpose-built helpers make lint rules more manageable: keep each function to one logical branch and document every new helper immediately. This strategy should be reusable when chasing down other complexity-heavy modules (e.g., the remaining cloud/xxx files still flagged by lint).
- Follow-up idea: build a checklist for future refactors—if a function is flagged for both complexity and missing JSDoc, break the logic into single-purpose helpers and add docs before rerunning lint.
