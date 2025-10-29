# JSDoc lint adjustment

## Challenge
Ran the full ESLint suite to follow the task flow and uncovered 900 warnings concentrated in `src/core/`, mostly missing JSDoc metadata. Needed to resolve at least one warning without destabilizing the surrounding complex functions.

## Resolution
Identified `getBatch` in `src/core/cloud/process-new-page/process-new-page-core.js` as a safe target and added explicit `@param` and `@returns` annotations describing the Firestore batch dependency. Re-ran `npm run lint` to confirm the warning count dropped.
