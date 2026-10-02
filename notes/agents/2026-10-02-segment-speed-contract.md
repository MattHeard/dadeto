# Segment speed contract checkpoint

Shared requiredSegmentSpeed preserves unit conversion and zero-duration policy.
Strict consumers treat moving with zero duration as infinite speed. The legacy
combined asset/custodian toy intentionally treats that case as zero. The new
segmentSpeedContract tests pin the difference rather than changing compatibility.

The initial arithmetic extraction passed 29 focused tests, lint and JSDoc types,
but did not reduce duplication (192 to 193 clones). Do not treat this checkpoint
as completion of dadeto-aaou. The next bounded step should share complete motion
measurement (distance, duration and speed) and remove repeated coordinate calls.
Focused coverage also requires multiSegmentAssetFulfillment and
fulfillmentBoundaries.coverage to exercise evaluateWorldLineMany.

Evidence: .tmp/segment-speed-tests.log, .tmp/segment-speed-lint.log,
.tmp/segment-speed-types.log and .tmp/segment-speed-duplication.log.

Follow-up: measureSegmentMotion now owns distance, duration and required speed;
four callers no longer repeat geographic coordinate conversion. This passed 49
tests with exact 100% coverage in five modules but left the clone count at 193.
The exact report exposed an identical overlaps implementation in
assignmentIntervals.js. Feasibility now imports and compatibility-reexports
that helper rather than duplicating it: strict minTokens 14 reports 192 clones.
Evidence: .tmp/segment-motion-tests-final.log,
.tmp/segment-motion-overlap-duplication.log and
.tmp/segment-motion-check-static.log. None of these proves a fully green gate;
the canonical duplication goal remains open.
