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

At first-source commit84671eabfa, the legacy page composed those workflow actions
with the original DOM operations and listener lifecycle. Adapter decomposition
and removal of that implementation remained for the following source step.
That first source step alone did not complete routing. Preserve the original ordering: register all listeners, write
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


## Native integration routed; complete validation pending

The legacy page implementation is now deleted. The real browser entry imports
`adapters/industrial-heat-pump/page.js`. Twelve platform modules each remain9-45
lines after Prettier and explicit adapter ESLint, without new exemptions. They
own required-node queries/availability, captured field reads/writes, native Intl
construction, text/list effects, field and summary effects, comparison dispatch,
view wiring, and listener lifecycle. Core owns all workflow and presentation
choices; boundary owns raw field and selector interpretation. Keep the exact
query, formatting, write, registration, initialization and disposal sequence.

The old published core/browser/industrialHeatPump/page.js URL is generated from
build/assets/industrial-heat-pump/page.js.txt; it is not a permanent source
forwarder. Both actual artifacts prove its export is the identical function as
the real adapter. The independent asset ledger also proves every expected module
or compatibility output matches its actual source bytes. Each real artifact
resolves33modules through10entry/compatibility roots, repeats613calculations /
19exports and all385presenter cases/5378snapshots with unchanged original hashes.

Four focused suites pass132tests with all four metrics100 on all12adapters and
workflow core. Separate affected packaging tests pass4tests/all4metrics100 on the
changed asset projection. Actual type contracts now have15independent negative
controls: TS2322x5, TS2339x3, TS2345x5, TS2554x1 and TS18047x1. They also prove
required-node availability must be narrowed and that actual forms, not documents
or nullable node bags, enter mounted capabilities. All11local gates pass; explicit
adapter ESLint passes. Evidence: reports/workflow-adapters-* and corresponding
coverage directories. Current authoritative CI/post-main and complete mutation
remain required in dadeto-tgrl, not established by these local results.

The retained whole mutation scope is32modules: all19nondeleted parent sources,
twelve relocated adapters and the new workflow. No static exclusions or threshold
changes. Execution stays queued until the live parent20module run terminates.
That parent has provisional survivors and cannot be merged on its CI result alone.

Harness hurdle: a broad replacement accidentally added page compatibility to the
scenario-export assertion loop as well as its intended closure/identity checks.
The real page export-identity check passed, then the wrong scenario assertion
failed. Scope edits to the exact expected list, assert the replacement target,
retain the existing scenario checks and repeat the real artifact probe. This was
not a production module failure or permission to weaken a comparison.


## Inherited native event lifecycle controls

The parent mutation probe exposed field-change registration, field-change cleanup
and preset-change cleanup gaps. Keep all native handlers; inherit the separately
pinned original3case/44snapshot event ledger and actual public-entry tests. The
adapter source and all type contracts remain byte-identical to9c97d23356; this
merge changes test controls/guidance only. Resolve the parent-owned presenter-note
conflict with its latest complete parent text; retain this workflow note and the
artifact CLI's missing-root guard. No legacy source implementation is restored.

Four focused suites now pass135tests, all four metrics100 across all12adapters,
workflow and asset projection (14files). All11local gates pass. Native event
receipt matches the original SHA8c3c7ed847931b5ddbd88d8b206616a5394427633ed4e3f71d0bd8ffa8e84006.
Both actual artifacts retain33modules/10entry-compatibility paths and source-byte
identity,613calculations/19exports, and388original cases/5422snapshots with outcome
SHAe720c551cc1af9a168add99e069202fabdf61eb03f7970cecce7da5b994a1294.
Evidence: reports/workflow-events-* and reports/coverage/heat-pump-workflow-events.
Type-negative controls remain the same15 actual composition checks. Complete32
mutation stays queued behind the parent's fresh complete20run; current CI and
post-main evidence remain mandatory before closure. No second full worker.
