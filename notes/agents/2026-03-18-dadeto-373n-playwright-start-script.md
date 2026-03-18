# dadeto-373n: Playwright-capable writer start script

- Unexpected hurdle: the repo already had `start:writer` and `start:writer:watch`, but only the watch variant was referenced from the bind-error guidance.
- Diagnosis path: confirmed the writer server already emits a stable readiness line on listen (`writer server listening on http://localhost:<port>/writer/`) and can be reused unchanged for Playwright smoke runs.
- Chosen fix: added `npm run start:writer:playwright` as a reusable alias to the existing writer server entrypoint and updated docs/error guidance to point at it.
- Next-time guidance: if Playwright needs a stronger probe than the listen log, add a tiny `/health` endpoint or a shell probe helper instead of changing the server boot path.
