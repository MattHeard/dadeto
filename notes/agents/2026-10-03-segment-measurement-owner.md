# Shared segment measurement owner

The strict minTokens14 report paired the duration and geodesic measurement
dependency headers. Relocated both implementations unchanged into
`segmentMeasurements.js`, retaining the original module paths and all named
exports: duration, geodesic length, isJsonObject, parseInput and vincentyDistance.
The common parser/measurement dependencies now have one coherent owner.

Duration's empty-input fallback remains separate from the geodesic raw parser.
Ordered timestamp validation, Vincenty calculations, fallback calculations and
output precision remain unchanged. No configuration changes or ignores added.

Evidence:

- `.tmp/segment-measurements-tests.log`: all 1229 toy tests / 134 suites pass;
  that collection did not prove exact coverage of the relocated module.
- `.tmp/segment-measurements-final-tests.log`: the three dedicated measurement
  and contract suites pass, 39 tests, exact 100% statements, branches, functions
  and lines for segmentMeasurements.js.
- `.tmp/segment-measurements-static.log`: terminal nine gates pass; duplication
  alone fails at 102 clones, down from 103.

Hurdle: broader toy-only coverage collection differed from isolated measurement
coverage despite passing behavior tests. Do not claim global coverage from either
subset. Preserve both logs and use the next full aggregate for authoritative
merged global evidence. The goal remains open in dadeto-aaou.
