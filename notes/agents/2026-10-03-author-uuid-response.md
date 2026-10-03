# Author UUID response selection

Request construction, HTTP success gating and payload selection now have
separate ownership. Keep the JSON method receiver, skip decoding unsuccessful
responses, and retain the accepted UUID's three reads (type, presence, return).
Do not cache the property: accessors can deliberately return different values.

Initial extraction passed tests but introduced another return-null tail clone,
leaving the count at 46. Reusing existing whenOrNull for deferred return selection
removed that fallback duplication; strict minTokens14 report now has 45 clones.
No threshold, suppression or exemption changes were made.

Focused UUID suite passes 10 tests with exact 100% module coverage:
`.tmp/uuid-response-tests.log`. Static aggregate fails only duplication45:
`.tmp/uuid-response-static.log`. Build passes: `.tmp/uuid-response-build.log`.
The goal and dadeto-aaou remain active; full aggregate evidence follows.

Terminal full acceptance: `TMPDIR=/home/matt/dadeto/.tmp
DADETO_COVERAGE_SHARD_SIZE=40 npm run check` exits 1 with duplication the sole
failure among ten outer gates, at 45 clones. Exact global coverage is lines
20332/20332, statements 21184/21184, functions 7059/7059, branches 10207/10207.
Evidence: `.tmp/clone-goal-45-full-check.log` and
`reports/coverage/coverage-summary.json`. Zero-clone completion remains unproven
because 45 clones remain.
