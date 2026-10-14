# Submit moderation rating AllowEffects audit

## Findings

The `submit-moderation-rating` cloud entry point keeps startup and request-time capabilities separate. Firebase initialization and HTTPS endpoint registration use the startup capability. The request boundary creates fresh capabilities for HTTP response effects and passes them through the core runner to the Firestore assignment update and rating write adapters. Firestore reads, auth verification, UUID generation, and timestamp/delete sentinel construction remain query or construction operations under the current policy. No unguarded command effect or captured startup token was found in this path.

## Evidence

- Focused tests: 6 suites, 33 tests passed.
- `npm run tsdoc:check`: passed.
- `npm run check`: passed all 10 gates.
- `npm run build:cloud`: passed.

## Next step

Continue the lexicographic cloud audit at `src/cloud/submit-new-page/index.js`. The Prioritised spec backlog collection is readable and currently exposes Workflow, Implementation, Rank, Priority, Workstream, Spec, and Last audited. It has no `Next step` property, so this source handoff belongs in the spec page content unless the database schema changes.

## Retrospective

- Unexpected hurdle: the backlog schema differs from the previous handoff assumption; the fetched source shows no `Next step` property.
- Diagnosis: fetched the current spec page and queried its parent data source rather than relying on earlier page content alone.
- Chosen fix: use the existing page handoff text and keep the next source path explicit there.
- Next time: fetch the current collection schema before interpreting or updating backlog handoff fields.
