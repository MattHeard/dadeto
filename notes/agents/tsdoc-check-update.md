## TSDoc check note

- **Unexpected snag**: `npm run tsdoc:check` still fails because the JS sources have hundreds of missing type hints / implicit anys (see admin-core, audio-controls, etc.). That meant I couldn't just fix the first report without seeing the same flood replay.
- **Diagnosis + fix**: I focused on `createSectionSetter`—added a type-guard helper plus better failure messaging and tightened the reusable setter’s JSDoc so the compiler sees a valid `object` before calling `mergeSection`. The helper isolates the `result.message` fallback, which also keeps ESLint’s complexity/no-ternary rules happy.
- **Learning/actionable idea**: For `checkJs` happiness, prefer small, documented helpers or explicit `result is ...` guards so data can be narrowed without piling branches into the caller. When tackling more tsdoc errors, continue the pattern of extracting helpers that carry JSDoc type assertions.
- **Follow-up question**: Should we pick a subset of modules (e.g., core/browser) and systematically add JSDoc-defined guards before rerunning tsdoc so the results become actionable?
