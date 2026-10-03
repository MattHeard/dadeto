# Visibility payload selection and materialization

The initial lazy null-guard replacement removed its original checkout pair but
created a callback-tail pair; count stayed 58. The successful tighter design gives
the existing payload builder sole ownership of field materialization. The selector
only checks identifier types and lazily calls that builder. Read order remains
variant, moderator, approval, moderator, variant; invalid variants read neither
moderator nor approval and never access Firestore.

Evidence `.tmp/visibility-payload-tests.log`: 39 tests, exact 100% module coverage.
`.tmp/visibility-payload-static.log`: duplication only, 58 to 57 strict clones.
Regular and cloud builds pass in corresponding `visibility-payload-build.log` and
`visibility-payload-cloud-build.log`. Threshold and ignore directives unchanged.
Fresh reports matter: moving a pair is not success. aaou remains open.
