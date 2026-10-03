# Shared open-path rendering

plotShared owns appending open paths and one final stroke. Doodle lines and
graph axes use independent segments; graph series use continuous point paths.
Callers retain beginPath and style order. Lazy projection generators preserve
canvas reads and drawing between projections; do not eagerly map coordinates
or stroke axes individually, which changes joins or alpha composition.

Initial segment-only extraction exposed a series-stroke tail clone. Sharing
continuous open paths removed it. Generator docs need yields and a supported
Iterable return type. Focused drawing coverage also exposed missing bitmap-text
checks; native text must not be called on bitmap paths.

Six focused suites pass 24 tests with exact 100% coverage of plotShared,
canvasDoodleCore and graphPlot: `.tmp/stroke-segments-tests.log`. Static aggregate
fails only duplication39 (40 baseline): `.tmp/stroke-segments-static.log`.
Build passes: `.tmp/stroke-segments-build.log`. No detector or suppression edits.
Full aggregate follows; dadeto-aaou and the goal remain active.

Terminal full checkpoint: `TMPDIR=/home/matt/dadeto/.tmp
DADETO_COVERAGE_SHARD_SIZE=40 npm run check` exits 1; duplication alone fails
among ten outer gates at 39 clones. Exact global coverage: lines 20327/20327,
statements 21181/21181, functions 7068/7068, branches 10201/10201. Evidence:
`.tmp/clone-goal-39-full-check.log` and `reports/coverage/coverage-summary.json`.
This checkpoint does not complete the zero-clone goal.
