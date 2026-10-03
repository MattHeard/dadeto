# Score, pair traversal, copy dispatch, and relay detail ownership

Four report-driven refactors keep strict minTokens 14, source scope, and all
detector rules unchanged. No exemption or ignore pragma was added.

Hi-Lo score advancement now has its own operation, separate from the next-card
state envelope. Passing the game state (not a cached score) preserves the three
stored score reads. The regression supplies a changing score getter and checks
field order and old-state identity. `.tmp/guess-score-tests.log`: 31 tests, exact
100% owner coverage; `.tmp/guess-score-static.log`: 30 clones, previously 31.

Co-change pair enumeration is a lazy iterator, separate from statistics updates.
The regression checks map insertion order, partner order, touch counts, repeated
supporting-id deduplication, and unchanged input files. Empty and singleton sets
remain covered. `.tmp/cochange-pairs-tests.log`: 9 tests, exact 100% owner
coverage; `.tmp/cochange-pairs-static.log`: 29 clones. Two old representative
matches became one direct Dendrite/webhook pair; always inspect the fresh report.

Dendrite recursive copying delegates each entry to a dispatcher. Joined paths,
directory checks, missing sources, and depth-first copying stay unchanged. The
existing fixture now includes a sibling after a nested directory and checks the
exact copy order. `.tmp/dendrite-entry-tests.log`: 2 tests, exact 100% owner
coverage; `.tmp/dendrite-entry-static.log`: 28 clones.

Relay JSON error extraction uses the shared lazy selector for accepted string
details. It still short-circuits null, preserves the two accepted error-property
reads, and does not cache a getter value. The regression checks the second value
is trimmed. Existing malformed, primitive, null, and non-string cases still pass.
`.tmp/relay-detail-tests.log`: 10 tests, exact 100% owner coverage. Final static
evidence: `.tmp/relay-detail-static.log`, after explicit formatting completed.

Build evidence: `.tmp/score-pairs-copy-relay-build.log`. Aggregate evidence:
`.tmp/clone-goal-27-full-check.log` terminated exit 1: all 21 test shards passed,
and the outer ten-gate summary failed only duplication (27 clones). Exact global
coverage: lines 20333/20333, statements 21187/21187, functions 7078/7078,
branches 10203/10203. Inspect terminal exit and the outer summary separately
from the test runner summary. Remaining clones stay under `dadeto-aaou`; this
checkpoint does not claim goal completion.

An approval-service usage-limit error temporarily prevented progress reads.
Polling the already-authorized live session remained available; a later approved
read succeeded. Do not restart a live evaluator or bypass approvals because an
observation failed. The original process supplied the terminal evidence above.

Next time, keep traversal enumerators and domain accounting separate, and test
ordering and laziness rather than only final counts. Extracting a report's
representative can expose a direct match between its other owners.
