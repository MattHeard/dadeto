# Spacetime request and interval-index owners

Strict duplication fell from 96 to 94 without configuration or ignore changes.
runToyRequest in formatToyError owns parse, domain calculation, readable JSON
serialization, and the existing runToyCalculation error boundary. World-line
ordering and temporal classification remain separate domain calculations.
The public parseInput/parseRequest exports, error strings, output field order,
and formatting contracts are unchanged.

createIntervalIndexes in assignmentIntervals owns point-first Map construction
shared by assignment evaluation and temporal relation calculation. It retains
raw key identity, original record references, and later-duplicate-wins behavior.
Assignment context still resolves the proposed interval after both maps exist.

Unexpected hurdle: the first pipeline scan reached 95 but exposed a previously
hidden Map-construction pair with assignmentIntervals. Sharing the complete
index context removed that pair rather than merely moving the wrapper suffix.
Read only reports from terminal scans; an in-flight rescan can still show the
previous JSON report. The final scan reports 94 with no matches in these owners.

Evidence: .tmp/spacetime-index-pipeline-tests.log records 206 passing tests
in 23 suites and exact 100% statements/branches/functions/lines for
formatToyError, spacetimeWorldLine, spacetimeSegmentTemporalRelation, and
assignmentIntervals. New direct pipeline regressions verify parse/calculation
identity and failure-stage order, including serialization errors. Index tests
verify key/reference identity and point failure before segment input is read.
.tmp/spacetime-index-pipeline-scan.log records 94 clones;
.tmp/spacetime-index-pipeline-static.log records nine other gates passing;
.tmp/spacetime-index-pipeline-build.log records a successful static build.

Prior pushed checkpoint 25a69c973c has terminal full aggregate evidence in
.tmp/clone-goal-96-full-check.log: duplication96 only, all other nine gates
passing, nine repository browser tests passing in 7.2s, and exact global
coverage lines20090/20090, statements20911/20911, functions6952/6952,
branches9951/9951. Do not conflate that global proof with this later focused
checkpoint. dadeto-aaou remains active until zero clones and a fully green
terminal aggregate are proved at the final implementation.
