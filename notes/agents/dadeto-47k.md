## dadeto-47k: Refactor hideArticleWhen parameters

- **Surprises / diagnostics:** `bd` daemon kept timing out, so I worked in direct mode. The bead description only said “refactor hideArticleWhen parameters,” so I inferred a clearer interface was desired rather than a bigger overhaul. Confirmed there were no other call sites by searching before making the change.
- **Work:** updated `hideArticleWhen` to take a single options object, updated `hideArticlesByCondition`, regenerated browser output (`npm run build`), and ran the full Jest suite plus ESLint (`npm test`, `npm run lint`).
- **Lessons / follow-up guidance:** When refactoring small helpers, regenerate the public assets before tests to keep them in sync; `npm run build` handles the copy/generate pipeline. The new object signature should reduce positional-boolean confusion, but let me know if a more expressive option name (e.g., `shouldHideMatching`) is preferred.
- **Open questions:** Should we export `hideArticleWhen` for targeted unit tests under the new signature, or keep it private? Any additional docs that need updating to mention the options bag?
