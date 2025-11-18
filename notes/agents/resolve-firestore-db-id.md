## Resolve Firestore Database ID

- **Unexpected hurdle:** While enforcing explicit environment arguments, I discovered the project contains three separate `resolveFirestoreDatabaseId` definitions. I had to align them so callers continue to provide the environment without relying on default fallbacks.
- **Diagnosis:** The exports in `src/cloud/firestore.js`, `src/cloud/assign-moderation-job/index.js`, and `src/cloud/generate-stats/index.js` all defaulted to `process.env` (or `getEnvironmentVariables()`). Because every call already computed its environment, removing the defaults wouldn’t change runtime behavior but did require updating multiple definitions.
- **Action:** Removed the default argument values and dropped the safe-navigation checks so that each helper now assumes callers pass a truthy environment object; this keeps the contract clear and avoids silently reading global state inside the helper.
- **Learned:** When logic is intended to operate on a caller-provided environment, it’s safer to accept the parameter without defaults to avoid accidental reliance on inherited globals.
- **Follow-up:** None at this time.
