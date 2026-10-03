# JSON error location projection

The strict duplication report paired the JSON error explainer's repeated location
object construction with an unrelated error serializer. Consolidating the matched
and unknown line/column branches gives the location projection one payload shape;
character-position messages still take priority and retain their original path.

Regression evidence: `.tmp/json-location-tests.log` passes 10 tests with exact
100% statements, branches, functions, and lines for the explainer. The added test
checks conflicting position/line coordinates and unknown Error locations.

Static evidence: `.tmp/json-location-static.log` records all nine non-duplication
gates passing and 35 strict clones, down from 36. No detector configuration,
exclusion, exemption, or ignore pragma changed. `.tmp/json-location-build.log`
records a successful production build.

Aggregate checkpoint: `.tmp/clone-goal-35-full-check.log` terminated with exit 1;
all 21 test shards passed, and the outer ten-gate summary failed only duplication
(35 clones). Exact global coverage: lines 20326/20326, statements 21180/21180,
functions 7070/7070, branches 10201/10201. Inspect the outer check-summary and
process exit status: the test runner's inner summary is not the aggregate gate
outcome. Remaining clones continue under `dadeto-aaou`.

Next time, prefer consolidating the actual payload projection over factoring
unrelated error serializers together solely because their punctuation matches.
