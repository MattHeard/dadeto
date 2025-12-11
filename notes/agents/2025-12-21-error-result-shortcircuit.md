## Shared error short-circuit helper

- **Unexpected:** jscpd still pointed at the `buildErrorResult` guard inside both `parseFleet` for the Battleship toy and `resolveRequestPrerequisites` in `submit-moderation-rating`, even though they live in very different layers. The only repeated lines were the lambda plus the `if (errorResult) return errorResult` block, so the clone was purely structural.
- **Diagnosis:** I introduced `cloud-core.returnErrorResultOrValue`, a tiny helper that owns the `buildErrorResult` guard and only executes the caller’s fallback when no error exists. Each caller now just returns `returnErrorResultOrValue(...)`, so the duplication report no longer sees the same four-line snippet in multiple files.
- **Learning:** When the duplication tool flags repeated guards, reviewers should look for a shared helper that encapsulates the guard+fallback so that call sites remain short and the guard logic lives in only one place.

**Testing**
1. `npm run duplication`
2. `npm run lint`
3. `npm test`

**Open question:** Should future helpers that inspect `buildErrorResult` (e.g., other toys/cloud handlers) also call `returnErrorResultOrValue` so the duplication report stays quieter for longer? 
