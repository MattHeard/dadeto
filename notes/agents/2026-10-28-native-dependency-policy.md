# Observable native dependency policy — 28 October 2026

Owning Bead `dadeto-e1oz`, Rank11 typed-logic prerequisite.

## Hurdle and diagnosis

The earlier includeOnly graph filter retained src/scripts/node_modules endpoints
but dropped Node builtins before the named prohibition could inspect them. A
real negative fixture now fails the original config even though its10 existing
package/domain/direction errors still appear. A source census alone was insufficient.

Deleting the filter exposed unrelated URL/static-alias/unresolved SDK endpoints
outside its prior graph scope and produced75 shell-containment errors. Cruiser also
normalizes node:fs to fs. Tightened fix: preserve the old source/package scope and
expand it with all runtime builtinModules names, accepting both normalized and
node:-prefixed endpoint forms. No prior source is excluded and no baseline added.

The native build/cloud/local shell containment rules recognize dependencyType core,
while browser containment and all logic native/package/direction restrictions stay
strict. Builtin permission belongs at the native integration layer; the graph's
actual dependency classifier decides what is a builtin, not a hand-maintained list.

## Regression and controls

The actual-cruiser fixture creates node:fs and bare fs/promises imports under all
three logic roots. It requires the named src-core-scripts-no-node-builtins violation
for both normalized endpoints under every root, retains package/domain/direction
checks, allows native build/cloud/local adapters, and denies browser native imports.

Two isolated negative configuration controls apply the same native assertion to
real graphs after removing the named prohibition or restoring the old endpoint
filter. Both must throw. Removing the named rule leaves a separate within-core
containment error; this control proves the dedicated guard remains, not that deleting
one redundant rule alone would permit native imports. Restoring the old filter hides
native endpoints entirely. No repository config is modified by these controls.

A helper extraction initially left one duplicate assertion referring to the removed
loop variable; deleting that leftover fixes the fixture. No rules were suppressed.

## Evidence

- Red: focused fixture1failed/4passed against original filter,
  `/tmp/dadeto-e1oz-red-policy.log`.
- Real green graph fixture5tests PASS2.111s; final fixture plus both negative controls
  7tests PASS12.046s, `/tmp/dadeto-e1oz-policy-controls-final.log`.
- `npm run depcruise`:PASS,1,042 modules /1,983 dependencies,
  `/tmp/dadeto-e1oz-repo-graph-final.log`.
- Retained real JSON graph `reports/mutation/native-dependency-policy-graph.json`
  and summary expose163 native edges across14 native endpoint names, zero logic
  native edges, zero errors/warnings. Exact config SHA-256
  `f5a17e73343f9c7276511d370c44b59946dbe6536b7fe885fac01ed678f93f91`.
- `npm run check -- --skip-tests`:all11 static gates PASS,
  `/tmp/dadeto-e1oz-policy-static.log`. Focused tests were executed separately;
  this local evidence does not establish full-suite/global coverage.
- `npm run build`, `npm run build:cloud`, `npm run verify:cloud-packages`:PASS,
  27 packages /713 modules /1,234 imports;
  `/tmp/dadeto-e1oz-policy-{build,cloud-build,closure}.log`.

The preceding UUID child rjmo is closed on exact successful Full Check40767918736,
artifact12850613700:1,091 suites /8,430 tests, global and both changed core metrics100%.
All native-remediation child receipts now pass. Keep this parent open until final
exact policy CI succeeds. No source
move is made here. No actual local Playwright/provider/production request or deploy.

## Remaining architecture work

This closes the graph-observability gap only when CI succeeds. The old whole-module
mutation directives, ambient clocks/console, existing value assertions/broad types,
trusted parsing, generator typing and namespace preparation/migration remain Rank11
work. Static AST native imports are zero; neither that census nor the graph claims
all runtime effects are eliminated.

## Next time

Use a real forbidden import and assert the named rule's emitted violation. Keep a
negative endpoint-filter control: a clean current graph cannot prove the policy
would reject a newly introduced dependency if that endpoint is filtered out first.
