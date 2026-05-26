Unexpected hurdle: the cloud-side tsdoc failures were more fragmented than the toy layer, with small helper signatures in several files masking the broader backlog.

Diagnosis path: I tightened the moderation-job allow-list logic first, then reran `npm run tsdoc:check` repeatedly to confirm whether the remaining failures were still local to the same helper or had shifted into the wider cloud stack.

Chosen fix: normalized the optional origin allow-list in `assign-moderation-job-core.js` and let the checker surface the next real backlog instead of guessing at the cloud-wide shape from the top few errors.

Next-time guidance: continue with the cloud helpers in small slices, starting with `cloud-core.js` because it is the next compact cluster after the moderation-job helper.
