Refined how the moderation handler props are wired and documented the move into a shared factory so future agents spend less time tracking around the duplication warning.

Unexpected hurdles:
- ESLint's `complexity` rule in `report-for-moderation-core.js` blocked the first guard refactor, forcing me to push the HTTP method check up into `createHandleReportForModeration` where it can stay under the threshold while still returning 405 for non-POST calls.
- The existing Jest suites assumed the domain handler emitted the POST guard, so I updated both the handler and `createHandleReportForModeration` tests to reflect the new responsibility.

What I learned:
- `jscpd` still reports two clone groups (`generate-stats` ↔ `mark-variant-dirty`, and `copy.js` ↔ `generate-stats`) after this change; the next iteration should focus on sharing the response path helpers referenced in those files.

Open questions:
- Should the `generate-stats` response plumbing be factored into a shared `sendResponseWithFailure` helper to clear the remaining clones, or is duplicating the `runWithFailure` patterns acceptable for now?
