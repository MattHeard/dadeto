# AGENTS Instructions for src/core

## Scope
These instructions apply to everything under `src/core/`, including browser/cloud helpers and shared utilities.

## Core Practices
- Keep functions under the ESLint complexity threshold by extracting narrowly scoped helpers; optional chaining, ternaries, and nested callbacks all count, so refactor early and re-run `npm run lint` after each extraction.
- When touching moderation/admin flows with dense guard logic, pull boolean checks into named helpers to make branches explicit and easier to test.
- Plan any rename or file move: search the repo (source, tests, build scripts, infra) and update all consumers in one change to avoid broken imports.
- For Firestore-style hierarchies (option → variant → page → story), sketch relationships first and build reusable fixture factories instead of hand-writing deep mocks in each test.
- Prefer focused unit tests for internal helpers over piling edge cases into a single integration test; export pure helpers as test-only utilities when needed and keep public APIs minimal.

## Tooling Tips
- If Watchman blocks Jest, run suites with `--watchman=false` to keep iterations fast.
- Use targeted ESLint runs (JSON output or a temporarily lower local complexity threshold) to pinpoint hot spots before larger refactors.

## Testing Expectations
- Run `npm test` after any core change; maintain full branch coverage, especially in content processing and Firestore integration paths.
- Share mock builders across tests (e.g., story hierarchy creators) to avoid missing links between parent/child documents and to keep coverage stable.
