Unexpected hurdle: the repo-level `npm run check` gate could not complete in this workspace because several local dev tools are missing from `node_modules` (`tsc`, `jscpd`, `espree`, `@babel/parser`, `jest`, `@eslint/js`).

Diagnosis path: I migrated the `src/cloud/realtime-call` entrypoint first, then ran `npm run check` to separate code regressions from environment problems. The failures surfaced before any signal pointed at the new v2 function wiring.

Chosen fix: migrate only `realtime-call` to `firebase-functions/v2/https` and update Terraform to `google_cloudfunctions2_function` plus `roles/run.invoker`, while leaving the rest of the repo on the existing v1 helper.

Next-time guidance: if this workspace is expected to run the full gate, reinstall dependencies before re-running `npm run check`; otherwise use a narrower functional smoke test for the migrated function and keep the bead open until the environment is fixed.
