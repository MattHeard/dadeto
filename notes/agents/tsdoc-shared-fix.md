# TSDoc check triage
- **Surprise:** `npm run tsdoc:check` early on was drowning in type complaints across `src/core/browser` + cloud helpers, so I scoped the work to the more tractable shared responder helpers and installed `@types/express` to satisfy the compiler.
- **Action:** Annotated `src/core/cloud/submit-shared.js` with more precise JSDoc (typed responder map, guard helpers, and explicit handler params) so the per-file check now passes even though the full run still fails on other modules.
- **Lesson:** When a global type check explodes, isolate a subsystem that can be reasonably fixed and capture the remaining blockers in the note for the next person.
- **Follow-up:** Still thousands of tsdoc errors in `admin-core.js`, `submit-new-*`, mutation dependencies, and missing `firebase-admin` typings—should we bake a separate effort to add the missing dependency declarations and break out the admin/browser logic into smaller pieces?
