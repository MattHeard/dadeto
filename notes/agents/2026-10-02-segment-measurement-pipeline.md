# Segment measurement pipeline

Duration and geodesic length duplicated request parsing, space-point
resolution, endpoint lookup, value/unit serialization and error handling.
spacetimeInput now owns that common pipeline; each toy supplies its measurement
formatter and parsing policy. Duration still treats empty input as an empty
request, while geodesic length still reports the JSON parse error.

Keep timestamp validation exclusive to duration and preserve geodesic
two-decimal meters versus string seconds. The new contract tests exercise
these distinctions and referenced coordinate resolution. The geodesic parser's
mutation-ignore pragma disappeared with the duplicated parser, not by moving
the suppression to the shared module.

Acceptance: 254 tests, 25 suites, exact 100% across three source modules
(`.tmp/segment-measurement-tests.log`). Static aggregate
`.tmp/segment-measurement-static.log` fails only duplication: 149 clones,
down from 152 at unchanged strict minTokens 14. Madge reports no source cycles
in `.tmp/segment-measurement-cycles.log`. Remaining work is dadeto-aaou.
