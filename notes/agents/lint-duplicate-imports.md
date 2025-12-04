# Lint duplicate-import cleanup

- **Unexpected hurdle:** ESLint flagged duplicate `../browser-core.js` imports even though only one module file was affected, so the warnings were easy to miss until the lint run reported them. I double-checked the three handlers with the duplicates to confirm each exported symbol was still used after coalescing the imports.
- **Diagnosis & options considered:** The report pointed directly to the files, so I merged the imports instead of suppressing the rule or re-exporting from an intermediary module.
- **What I learned:** Consistent import ordering keeps repeated modules obvious; when eslint points to duplicate imports, start by consolidating to a single destructuring line instead of spreading symbols across separate statements.
- **Follow-ups/open questions:** None—lint now passes, but revisit whenever imports drift to confirm eslint warnings remain actionable.
