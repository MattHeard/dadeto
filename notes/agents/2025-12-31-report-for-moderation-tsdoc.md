## Report-for-moderation tsdoc cleanup

- The latest `tsdoc:check` failures flagged `report-for-moderation-core.js` because the type guard around `body.variant` was missing and the helper callback was built on raw `unknown` payloads.
- I removed the `whenBodyPresent` indirection, added a proper type-guarding `hasVariantString` helper, and rewrote `resolveVariant` so TypeScript sees the trimmed string path without complaining about `unknown` or `null`.
- `tsdoc:check` still fails across `admin-core`, the cloud submit flows, and render-variant helpers; future attempts should continue chasing the remaining single-error files until the compiler quiets down.
