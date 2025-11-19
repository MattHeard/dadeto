## Remove max-params suppression

Removed the `eslint-disable-next-line max-params` comment in `src/core/cloud/submit-new-story/submit-new-story-core.js` so the core lint rule will now report the warning as intended. There were no surprises while making the edit, but we now expect the lint run to fail until someone either reduces the parameter count or accepts the warning as part of follow-up work.

Future agents may want to track the status of this warning—should it stay exposed for visibility, or should the handler be refactored into a helper to satisfy the rule? Consider adding a short ticket or note if there is a preferred path forward.
