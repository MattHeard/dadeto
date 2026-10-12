# Render author AllowEffects audit

- **Unexpected hurdle:** The live Specs handoff advanced after the prior source-cloud loop, so repository history alone did not identify the next audit target.
- **Diagnosis:** The current Notion rank-1 **Next step** pointed to `src/cloud/render-author/index.js`; source inspection and existing boundary tests showed its effects were already scoped.
- **Fix:** No code change was needed. Firebase initialization and trigger registration use the startup capability; each trigger invocation gets a fresh capability; Storage save and Firestore update adapters require it. Core Firestore access exposes reads only, while `FieldValue.delete()` and Storage/bucket setup construct SDK values/references.
- **Evidence:** Focused Jest passed (6 suites / 21 tests); `npm run tsdoc:check` passed. The existing full `npm run check` and cloud build passed on the same code state in commit `deed7208bb`.
- **Next:** Continue the lexicographic source-cloud audit at `src/cloud/render-contents/index.js`.
