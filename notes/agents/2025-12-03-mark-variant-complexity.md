## Mark Variant Dirty Complexity (2025-12-03)

- **Unexpected:** `createHandleRequest` was already borderline but lint still reported complexity 3 even though its body simply validated dependencies and forwarded to `processHandleRequest`. The rule counts nested functions and default parameters, so my first refactor kept tripping new helpers with extra warnings.
- **Diagnosis:** I experimented by pulling the inner handler into a dedicated builder and gradually moving defaults into resolver helpers. Each change had to be validated by re-running `npm run lint` so I didn’t miss the new warnings in the same file before moving on.
- **Actionable takeaway:** When the complexity rule fires for a seemingly minimal function, look at nesting (nested functions/default arguments) and break those into focused helpers whose own logic stays under the limit. Also re-run lint before assuming a refactor succeeded—new helpers can be a surprising source of additional complexity flags.
- **Testing:** `npm run lint` (still shows unrelated warnings in render/assign-moderation scopes) and `npm test`.
- **Open question:** There are other outstanding complexity warnings in `assign-moderation-job-core.js` and `render-variant-core.js`; we didn’t touch them but future work could lean on the same helper-extraction pattern so they pass cleanly.
