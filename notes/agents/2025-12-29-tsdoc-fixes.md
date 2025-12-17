## Tsdoc check tweaks

- Running `npm run tsdoc:check` surfaced the existing backlog of strict TypeScript warnings across `admin-core`, submit helpers, and render variants, which still block the job (the failure list now matches the previous run minus the helpers I touched).
- I addressed a handful of manageable helpers: typed `createResponder` dependencies, declared an `AsyncResult` for the response helpers, removed the synthetic empty request stubs in `request-normalization`, and ensured `report-for-moderation` always returns a promise while tightening the CORS helpers and response sender. These changes reduce noise in the report and keep the updated utilities aligned with the JSDoc expectations.
- There are still dozens of type errors left in `admin-core.js`, submit helpers, and render-variant utilities; future work would ideally introduce targeted JSDoc annotations or helper type shims (e.g., `@typedef` for the admin configs) to gradually shrink the tsdoc failure list.
