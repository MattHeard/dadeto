# Candidate segment resolution

Four toys repeated the same singleton segment-map construction. The shared
resolveCandidateSegment helper retains each caller's point preprocessing and
raw segment ID lookup. Numeric IDs still fail lookup against string map keys;
missing candidates still produce Unknown segment: undefined. Explicit regression
cases in segmentSpeedContract pin those legacy responses.

The candidate map can contain an undefined record, which the existing resolver
rejects. Its JSDoc now describes that real input rather than hiding it with a
type assertion. Reusing indexPointRecords also removed the combined writer's
identical inline indexing logic. The touched runner-shift toy's historical
Stryker disable block was removed; no new ignore or exemption was added.

Candidate extraction alone reduced186 to183 clones; final point-index reuse
produced one extra import-level fragment, for a net186 to184. Evidence:
.tmp/candidate-resolution-tests-final.log (55 tests; exact100 across five changed
modules), .tmp/candidate-resolution-check-static.log (duplication only fails),
and reports/duplication/jscpd-report.json. Owner dadeto-aaou remains in progress.
