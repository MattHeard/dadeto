# Heat-pump workflow and platform separation

Owner: dadeto-tgrl, following dadeto-kvq9. This is a source step toward the full
rank11 architecture, not complete integration routing or whole-tree migration.

The original page mixed private current-result workflow with DOM operations.
Move the actual calculate/input/preset/reset/export/initialize bodies into
`logic/core/industrial-heat-pump/page-workflow.js`. Its view contract exposes real
field, selector, rendering and feedback capabilities; download is a separate
effect port. Scenario parsing stays in integration at the exact selector read;
trusted core never imports a boundary module. The existing pure scenario-name
operation is shared directly by workflow and presentation. Keep result validity
and current-result checks: these represent domain/state decisions.

The legacy page currently composes those workflow actions with the original DOM
operations and listener lifecycle. Physical adapter decomposition/removal of that
legacy implementation remains in this bead. Do not describe this first source
step as completion. Preserve the original ordering: register all listeners, write
base fields, calculate/render, then write base feedback. Propagate effect and
programming failures without fallbacks. Actions retain their actual callable
identity when registered and removed.

Acceptance uses the existing immutable original graph at 6d2a626b: 328 cases /
4600 snapshots, twenty native formatter/failure controls / 260 snapshots and
37 DOM mutation controls / 518 snapshots. Original receipts must not be rewritten.
The first extraction passes all three source corpora unchanged. Its initial
integrated Jest proof passes128tests and all four coverage metrics at100 for the
new workflow and old DOM integration. Exact evidence is under reports/workflow-*
and reports/coverage/heat-pump-workflow. Final artifact/local/CI evidence belongs
in the owning bead; whole21module mutation preserves all20parent modules and is
queued while the parent's full mutation process is live.

The first aggregate found a clone between returning the workflow action object
and immediately destructuring all of it in integration. Use the actual workflow
object directly when attaching/removing listeners instead. This removes redundant
mapping while retaining callback identity; no clone threshold or exclusion changes.

Environment hurdle: /tmp is a2GBtmpfs and old Jest transform caches exhausted it.
The first new Jest invocation never started. Use worktree-local disk-backed TMPDIR
and Jest cache for this branch. Two specifically identified transform caches had
all file mtimes before November9 and were removed, freeing227MB; active mutation
caches and all evidence were retained. Never clear the whole shared cache during
an active mutation run. No test or source failure was inferred from ENOSPC.

Final first-source-step evidence:132focused/packaging tests pass, all four metrics
at100 for both moved workflow and legacy integration. All11aggregate gates pass
in reports/workflow-final-check.log, with zero clones and zero audit findings.
The expanded actual composition contract has twelve independent negative controls;
removing them in memory gives exactly TS2322x5, TS2339x3, TS2345x3 and TS2554x1.
Site/cloud builds and27package/711module/1231import verification pass. Both real
artifacts resolve21modules and preserve613calculations/19exports; the actual
browser entry repeats385cases/5378snapshots in each root with the original combined
SHA01b75e50cb57a6bd42843a2cd422c713d0319390358c348939c83eeab2f7cd89.

Artifact harness pitfall: calling either artifact CLI without root arguments used
to run zero cases and exit0. Initial empty output was not accepted as verification.
Both CLIs now require at least one root and independently fail missing arguments
with exit1. Real acceptance uses explicit roots public and
infra/cloud-functions/object-minute-rental-search. Do not equate a zero exit with
a nonempty artifact receipt. Cloud remains a module-only archive exercised with
the immutable original HTML fixture; site uses its actually published HTML.
