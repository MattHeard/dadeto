# Lazy Notion active-run projection

The strict report matched the guarded null tails of active-run object and run-ID
readers. Both now use canonical `whenOrNull`, keeping the original conditions and
selected property reads. Run IDs are not trimmed or coerced; a changing getter's
second value is returned even when falsy or undefined. Selected getter exceptions
retain their identity. The integrated alive-run test preserves state identity and
five total activeRun reads across reconciliation and poll result construction.

Focused evidence: `.tmp/active-run-tests.log`, 23 passing tests and exact 100%
poll coverage. `.tmp/active-run-static.log`, all gates pass except duplication,
70 to 68 strict clones. `.tmp/active-run-build.log`, successful packaging.
Full checkpoint acceptance is `.tmp/clone-goal-68-full-check.log`.

Terminal `npm run check` exited 1: its outer summary reports 10 checks, with only
duplication failing (68 clones). The other nine checks passed. Exact aggregate
coverage is lines 20360/20360, statements 21210/21210, functions 7054/7054,
branches 10237/10237, verified in `reports/coverage/coverage-summary.json`.

Threshold, exclusions and ignore directives remain unchanged. Continue from the
fresh JSON report, not an earlier remembered clone pair. dadeto-aaou stays open.
