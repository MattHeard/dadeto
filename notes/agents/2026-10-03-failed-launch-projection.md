# Failed-launch projection

Two strict report pairs shared guarded-null tails in Symphony's failed launch
projection. Canonical `whenOrNull` now owns the full predicate and lazy shallow
copy. Do not cache the candidate: the prior contract reads lastLaunchAttempt four
times. Tests assert that count, a distinct copied object, and shared nested detail
identity. Non-failed attempts still do not carry into the new status.

Evidence: `.tmp/failed-attempt-tests.log`, 34 tests in two suites, exact 100%
bootstrap coverage in all four metrics. `.tmp/failed-attempt-static.log`: all
static checks pass except the existing clone backlog, reduced 67 to 65.
`.tmp/failed-attempt-build.log`: successful build. Detection configuration and
ignore directives were not changed. dadeto-aaou remains open until zero clones
and a completely green full gate.
