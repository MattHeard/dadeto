Unexpected hurdle: the new author-uuid flow kept tripping repo gates in different places as I tightened coverage, especially around the simulator route and cloud wrapper branches.

Diagnosis path: I used the coverage report and focused Jest runs to identify the exact uncovered branches in `google-auth-cache`, `get-author-uuid-v2-core`, and the local GCP simulator instead of widening the tests blindly.

Chosen fix: I kept the feature code small, added explicit tests for the cache fallback, Express responder, and simulator route, and left the browser wrapper and local simulator boundaries intact.

Next-time guidance: start from the coverage artifact and add one branch-targeted test per uncovered path before touching the implementation; that kept the final `npm run check` green without introducing new regressions.
