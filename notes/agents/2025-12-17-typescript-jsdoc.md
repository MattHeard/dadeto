# 2025-12-17 TypeScript JSDoc validation

- Installed TypeScript only after escalating the sandbox to allow access to the npm registry because the default network permissions blocked `npm install --save-dev typescript`.
- Running `npm run tsdoc:check` now surfaces hundreds of TypeScript complaints across `src/core/browser` and `src/core/cloud` (missing properties, implicit `any`s, incompatible callback signatures, undefined optional fields, etc.), so the existing JSDoc annotations still need cleanup before the check can pass.
- I browsed the initial failure output (e.g., `admin-core.js` callback signatures, missing `express` typings, `firebase` imports) to understand the class of issues; relaxing the config would hide these discrepancies, so keeping `strict` for now seems valuable even though it overwhelms the current code.

Open questions/follow-ups:
1. Do we want to add curated `.d.ts` stubs (e.g., `express`, `firebase-admin`, `google-accounts`) before insisting on a clean run?
2. Should we tackle these TypeScript complaints in layers (browser core first, then cloud paths) so the command eventually succeeds without suppressing the insights?
