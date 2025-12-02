# Agent Retrospective – 2024-07-17 (Assign moderation guards)

- **Surprise:** `assign-moderation-job-core.js` reported multiple complexity violations even when the logic was just a couple of guards and optional chains (e.g., `isSnapshotEmpty`, `executeSingleGuard`, `runChain`); ESLint counts each boolean expression.
- **Action:** Pulled the guard expressions into dedicated helpers (`isMissingVariantDoc`, `snapshotIsEmpty`, `extractGuardError`, `shouldShortCircuit`) so the callers now delegate the conditional checks while staying under the complexity ceiling.
- **Lesson:** When multiple guard helpers live close together, extract each branch into a small helper and keep the high-level flow linear; it keeps the logic readable and keeps `eslint complexity` quiet.
