# Init admin app decomposition

- Unexpected hurdle: the existing generic Google auth module calls the Firebase ID-token method with a detached receiver, while `initAdminApp` previously invoked it as a method on the current user.
- Diagnosis path: reused the generic module in an initial extraction, compared its call shape with the original code, and added a receiver-sensitive regression before selecting the final implementation.
- Chosen fix: keep the cohesive `initAdminApp` dependency object and extract named factories for Google sign-in, sign-out, and token lookup. Preserve lazy construction, config gating, Firebase setup order, the fresh-token/cache fallback, `onHandlersReady` timing, and the direct `currentUser.getIdToken(true)` receiver.
- Next-time guidance: check call receivers and timing before reusing an existing adapter. The targeted arity scan for `admin-core.js` is clean; run a fresh repository-wide scan before selecting the next cluster. Global rule enforcement remains staged until the full baseline is resolved.
