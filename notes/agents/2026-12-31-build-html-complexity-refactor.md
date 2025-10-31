# Build HTML complexity refactor

- **Surprise:** Running `npm run lint` dumps the entire lint report via `cat reports/lint/lint.txt`, which easily spans hundreds of warnings. The shell looks frozen until the dump finishes—patience is required, otherwise it is tempting to interrupt the command and miss the real output.
- **Diagnosis:** I tailed the regenerated `reports/lint/lint.txt` to confirm the highest cyclomatic complexity warning. The `rg "complexity of 15"` trick quickly isolated the worst offenders so I could focus on `src/core/cloud/render-variant/buildHtml.js`.
- **Decision:** Rather than trying to tame the original mega-function in place, I extracted the option list builder and other condition-heavy snippets into helpers. That dropped `buildHtml` from 15 down to 7 while keeping the helper under the original ceiling (complexity 4 < 15).
- **Tip for next time:** Expect lint to flag the helper too (the complexity ceiling is still 2). That's acceptable for this task, but if you need a clean lint run you’ll have to continue decomposing—e.g., split `buildOptionItem` to separate attribute assembly from HTML formatting.
- **Follow-up idea:** It may be worth introducing a templating utility for these HTML strings; repeated manual string concatenations are a breeding ground for high complexity and subtle escaping bugs.
