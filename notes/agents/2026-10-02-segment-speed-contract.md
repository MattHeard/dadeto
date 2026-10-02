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
