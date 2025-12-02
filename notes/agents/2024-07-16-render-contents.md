# Agent Retrospective – 2024-07-16 (Render contents)

- **Surprise:** The `resolveHeaderValue` helper kept getting flagged even though it only selected one of two optional headers; ESLint treats each optional check as branching, so the function stayed above the complexity threshold.
- **Action:** Created `getAuthorizationValue` to guard the headers access and moved the fallback into `getAuthorizationCandidate`, so the exported `resolveHeaderValue` is a single call and the conditional now lives in a narrow helper.
- **Lesson:** Breaking optional access chains into helpers with one responsibility keeps the outward-facing API trivial and satisfies strict complexity rules without changing behavior.
