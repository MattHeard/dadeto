# Splitting Google sign-in dependency validation

- **What surprised me**: Extracting the validation logic triggered jsdoc's destructured-param rules, which immediately rewrote my comment stubs into failing placeholders. I thought removing the annotation would silence the rule, but eslint instead insisted on a fully typed doc.
- **How I diagnosed it**: Each `npm run lint` run showed new `root0.*` warnings. Inspecting `src/core/browser/admin/core.js` revealed the auto-generated comment, so I rewrote it with explicit shapes and reran the linter to confirm the complaints disappeared.
- **Future tip**: When introducing helpers that destructure objects, start by drafting the final jsdoc signature rather than leaving TODO comments—the plugin replaces them with noisy boilerplate.
- **Follow-up idea**: The admin module still has many double-digit complexity warnings (for example `initAdmin` and `createRegenerateVariant`). Breaking those routines down next would have the biggest impact on the lint report.
