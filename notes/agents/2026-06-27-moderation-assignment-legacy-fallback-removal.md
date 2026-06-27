Unexpected hurdle: the assignment tests were still split across three suites, and one entrypoint test still depended on a Firestore double without `collectionGroup('variants')`.

Diagnosis: once `createRunVariantQuery` was made strict, the remaining tests exposed every place that still assumed the legacy moderation query shape.

Chosen fix: removed the runtime fallback, updated the branch and entrypoint tests to use the nested `stories/.../pages/.../variants/...` collection-group path, and added an explicit failure case for missing collection-group support.

Next-time guidance: when a cloud path is intentionally production-only, make at least one test assert that unsupported adapter shapes throw immediately instead of silently falling back.
