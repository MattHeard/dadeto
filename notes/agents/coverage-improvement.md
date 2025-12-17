# Coverage stretch

- `submit-moderation-rating-core.js` was still missing line 487, which represented the defensive guard that never executed during normal request processing. Instead of trying to brute-force the throw in tests, I simplified the responder so the success path only runs when both prerequisites and context succeed—removing the unreachable branch and letting TypeScript know `bodyResult` is always defined there.
- Running `npm test -- submit-moderation` now reports 100% coverage for `core/cloud/submit-moderation-rating/submit-moderation-rating-core.js` while keeping the existing tests intact.
- Open question: these modules still rely on `common-core` and `cloud-core` which have very low coverage; we might automate generating thin unit tests for the shared utils once the API stabilizes so the tsdoc check and coverage goals move in tandem.
