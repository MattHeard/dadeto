# JSON Parse Error Explainer

- Unexpected hurdle: the new toy passed its focused test but failed `npm run check` twice on global coverage.
- Diagnosis path: I used the coverage summary to isolate the uncovered branches in `jsonParseErrorExplainer.js`, then added tests for the line/column parser message path, the non-`Error` throw fallback, and the non-finite index helper branch.
- Chosen fix: export the tiny location helpers and test them directly, while keeping the public toy output as structured JSON.
- Next-time guidance: when a toy adds diagnostics branches, write one test per message-shape fallback up front so repo-wide coverage does not stall after the first green unit run.
