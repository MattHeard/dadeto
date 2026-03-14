## Trial

- directory: `src/core/cloud/get-moderation-variant`
- bead: `dadeto-zx7p`
- trial focus: decide whether the `isAllowedOrigin` CORS helper belongs in `get-moderation-variant-core.js` (the directory-named shared module) rather than living in `cors.js`, and keep the helper reachable via a thin re-export so existing consumers stay stable.

## Rubric

- shared/helper placement decision: moved the `isAllowedOrigin` implementation directly into `get-moderation-variant-core.js`, exported it alongside the other shared utilities, and turned `cors.js` (plus the `src/cloud` and `public` copies) into straightforward re-exports.
- where the agent looked first for shared logic: opened `get-moderation-variant-core.js` and saw the handler flow responsible for approving requests and building variants, so that file was the natural first stop.
- obvious vs exploration: mostly obvious after verifying the helper only served this directory and that moving it would not create cyclical dependencies because the re-export layer could keep existing paths intact.
- helper-file sprawl effect: positive; one fewer helper fragment and every variant retrieval workflow now looks for the shared core before probing `cors.js`.
- shared-module coherence: `get-moderation-variant-core.js` already owns request validation, Firestore lookups, and response shaping, so it is now also the canonical source of truth for origin validation.
- directory-splitting pressure: none; the directory still feels cohesive after the helper shift.
- import predictability: improved because consumers import `isAllowedOrigin` from the core module, so future agents can head straight to the shared file instead of scanning an adjacent helper file.

## Conclusion

This fourth trial confirms the shared core in this Cloud directory should own the small CORS helper so the surrounding handler logic stays co-located, just like the third trial that absorbed submit helpers but unlike the first trial that kept capture-form helpers separate. `npm test` verified the change.

## Runner note

- unexpected hurdle: the published `public` tree and `src/cloud` copies still exposed the helper directly, so I had to rewire those re-exports after moving the implementation.
- diagnosis path: read `src/core/cloud/get-moderation-variant/get-moderation-variant-core.js`, `public/core/cloud/get-moderation-variant/get-moderation-variant-core.js`, and their `cors.js` companions to confirm what each runtime target imported before the refactor.
- chosen fix: defined `isAllowedOrigin` in the shared core, exported it there, and left all helper shells (`cors.js` plus the downstream `src/cloud`/`public` files) as thin re-exports so consumers keep working.
- next-time guidance: when absorbing helpers that have copies in `src/cloud` or `public`, update both the source and the published re-exports together so the deployment artifacts never point back at the abandoned helper file.
