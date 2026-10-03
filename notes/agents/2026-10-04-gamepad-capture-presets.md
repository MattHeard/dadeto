# Shared gamepad readers and capture-label presets

The gamepad button and axis readers now bind their detector and named field
projector to one shared reader operation. Detection precedes projection and the
existing button-before-axis priority stays intact. Strengthened first-poll tests
use competing axes, assert the first button wins, verify unchanged polls do not
resubmit, and check the first changed axis wins when buttons are absent.

`.tmp/gamepad-reader-regression-tests.log` passes all 16 gamepad tests with exact
100% owner coverage. After explicit lint completed,
`.tmp/gamepad-reader-static.log` records 23 strict clones, down from 27, with no
remaining gamepad pairs and all other static gates passing.

Capture-label presets now bind a named operation to a label-pair object. The
updater still uses the current call's DOM facade and button. The stronger test
reuses one updater with an alternate facade and verifies receiver identity and
undefined return even when the facade returns a value.

The initial extraction had five parameters, violating the four-parameter lint
limit. Grouping the bound label pair resolved the warning without an exemption.
`.tmp/capture-preset-refined-tests.log` passes 13 lifecycle tests with exact 100%
owner coverage. `.tmp/capture-preset-refined-static.log` records 22 strict clones
and all nine other gates passing. Formatting preceded report generation.

Build evidence: `.tmp/gamepad-capture-presets-build.log`. Aggregate checkpoint:
`.tmp/clone-goal-22-full-check.log` terminated exit 1: all 21 test shards passed,
and the outer ten-gate summary failed only duplication (22 clones). Exact global
coverage: lines 20335/20335, statements 21189/21189, functions 7078/7078,
branches 10203/10203. Inspect terminal exit and the outer summary separately from
the test runner summary. The detector remains strict at minTokens 14, with no
new exemptions or ignore pragmas. Remaining clones stay under `dadeto-aaou`;
this checkpoint is not goal completion.

Next time, group bound policy into a cohesive preset object rather than adding
positional parameters. Test reused operations against a different DOM receiver
and competing changed inputs, not just their simplest successful call.
