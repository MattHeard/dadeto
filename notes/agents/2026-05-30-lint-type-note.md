# Lint type cleanup for verifyAdmin

- **Challenge:** ESLint flagged `RegExpMatchArray` in `src/core/cloud/mark-variant-dirty/verifyAdmin.js` as an undefined JSDoc type even though Node exposes the class globally. The rule blocks undefined type references, so the inline type alias triggered a warning that prevented a clean lint pass for the core directory.
- **Resolution:** Replaced the problematic reference with the equivalent `string[]` contract in the dependency injection JSDoc signature. This keeps the documentation accurate for the matcher callback while satisfying `jsdoc/no-undefined-types` without altering runtime behavior.
