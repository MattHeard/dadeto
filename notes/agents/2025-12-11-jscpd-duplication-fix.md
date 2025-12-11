# Duplication refactor

- The jscpd runs kept finding clones around the moderation and new-story responders because both files repeated the same dependency guards and success response scaffolds. Rather than editing the duplicates in place, I introduced helpers in `src/core/cloud/cloud-core.js` (`sendOkResponse`, `assertFunctionDependencies`, `assertRandomUuidAndTimestamp`) so the callers can lean on a shared contract instead of copy/pasting assertions.
- The run-after-run tuning also exposed that the `res.status(200).json({ ok: true })` idiom appeared in several cloud APIs, so I now call `sendOkResponse(res)` from `generate-stats`, `mark-variant-dirty`, and `render-contents` to keep the message consistent and keep the duplication count down.
- While digging through this, I simplified the authorization helpers (`submit-moderation-rating-core` now reuses `normalizeAuthorizationCandidate` and no longer defines its own array extractor), which should keep token parsing aligned with the rest of `cloud-core`.

Open questions / follow-ups:
- Should we reuse `assertFunctionDependencies` (and the new UUID/timestamp helper) for other responders in the cloud layer so that future duplication warnings are easier to eliminate?
