# Unique overlap cardinality

The scanner/countOverlap pair shared a mutable count-loop tail. Scheduler overlap
is now the cardinality of filtered unique candidates. Do not filter before making
the Set: that would probe duplicate values repeatedly. Membership calls retain
their lookup receiver, per-unique getter reads, insertion order and JS truthiness.
Errors stop further membership probes.

`.tmp/overlap-cardinality-tests.log`: 13 passing tests, exact 100% owner coverage;
direct seam tests include duplicates, empty inputs, NaN, signed zero, truthy/falsy
non-booleans, getter count/receiver and stopped probes on failure.
`.tmp/overlap-cardinality-static.log`: duplication only, 53 to 52 strict clones.
`.tmp/overlap-cardinality-build.log`: passed. No threshold/ignore changes; aaou open.
