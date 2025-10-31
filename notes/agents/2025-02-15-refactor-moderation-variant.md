# Moderation Variant Complexity Extraction

- **Surprise:** ESLint's complexity limit of 2 is unforgiving—splitting `loadVariant` still left helper functions over the threshold due to chained boolean checks, so I had to introduce small utilities and richer JSDoc to satisfy the style rules.
- **Diagnosis:** After refactoring I re-ran `npm run lint` and inspected `/tmp/lint.log` to confirm the complexity warnings dropped from 13 to 4. The log also revealed the new jsdoc warnings, prompting the comment updates.
- **Guidance:** When refactoring browser modules, budget time for ESLint's jsdoc plugin: add full descriptions and return annotations immediately to avoid back-and-forth fixes. Use helper functions like `shouldRetryLoad` to isolate branching logic without inflating the primary function's complexity score.
- **Follow-up idea:** Future work could chip away at `regenerateVariant` in `src/core/browser/admin/core.js`, which still reports complexity 13.
