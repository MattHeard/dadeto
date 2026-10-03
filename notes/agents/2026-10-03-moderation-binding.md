# Moderation dependency binding

The strict report matched a closure factory tail with other factory boundaries.
The moderation factory now binds its dependency object directly to its processor.
The processor reads dependency properties on each invocation, before the method
guard; do not destructure or snapshot them during factory creation.

Regression tests verify creation-time validation reads, per-request getter order,
replacement of the persistence function after creation, synchronous getter errors
even for GET, and the default empty request. Existing response tests remain intact.
Evidence: `.tmp/moderation-binding-tests.log`, 38 tests/four suites, exact 100%
module coverage. Static `.tmp/moderation-binding-static.log`: duplication only,
62 to 61 strict clones. Regular and cloud builds pass in the corresponding
`moderation-binding-build.log` and `moderation-binding-cloud-build.log` artifacts.
No thresholds, exemptions or ignore directives changed; dadeto-aaou stays open.
