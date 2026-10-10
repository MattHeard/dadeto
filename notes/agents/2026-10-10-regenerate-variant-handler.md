# Regenerate variant handler decomposition

- **Unexpected hurdle:** The first type-documentation run rejected the newly extracted closure because its awaited payload had no explicit type.
- **Diagnosis:** The payload shape is inferred at runtime from `resolveRegenerationPayload`, but the local operation boundary needs a declared type for the repository's TSDoc checks.
- **Fix:** Annotated the payload as `Awaited<ReturnType<typeof resolvePayload>>` and extracted event coordination into `createRegenerateVariantEventHandler`. The public options object remains stable, and the request path still receives the existing `bindEffectBoundary` capability.
- **Evidence:** Five focused Jest suites passed (192 tests); `npm run lint`, `npm run tsdoc:check`, and `npm run check` passed. The full check reported 10 gates, 0 failures, 11/11 local E2E tests, and 0 duplication clones. The targeted admin-core arity count fell from 5 findings to 4.
- **Next-time guidance:** Continue with one dependency cluster at a time. Preserve the effect boundary and existing early-return/error behavior, then update the Notion parameter-bag baseline after the full check is green.
