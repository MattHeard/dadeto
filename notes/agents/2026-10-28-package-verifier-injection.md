# Cloud package verifier platform injection

Bead `dadeto-6nik`, child of `dadeto-e1oz`; Rank11 remains Active / Partial.

## Diagnosis and change

The verifier already accepted a parser, but core still imported node:module,
node:fs and node:path, defaulted to native filesystem calls and read process.cwd.
Require parser, pure path operations and builtin names at factory construction;
require explicit root/filesystem at invocation. Snapshot the builtin registry for
each factory. Bind path-dependent helpers inside that factory instead of adding
another argument to each traversal helper. Filesystem methods are read-only
queries with a precise four-method port; no native runtime/type imports remain.

Diagnostic output is permission-first. Core main receives AllowEffects and forwards
it to every supplied/default writer. The local public main(options) mints permission
at the existing boundary, supplies native filesystem/path/builtin/cwd defaults,
and adapts the existing one-argument diagnostic callback. Command options, exit
statuses, report formatting and traversal behavior remain unchanged.

A new explicit-undefined options case caught an adapter regression: spreading
undefined values over defaults loses the original destructuring-default behavior.
Choose local defaults with nullish selection. A fake builtin-registry test initially
expected source order, but the existing AST stack walks imports in reverse order;
correct the fixture rather than change runtime diagnostic order.

## Evidence

- Three focused suites /24tests pass; core tests can use entirely fake filesystem,
  non-native path syntax, a custom builtin registry and parser. They verify all
  resolution/reader arguments, registry isolation and writer permission forwarding
  for success, issues and missing archives. The CLI retains omitted/empty/explicit
  undefined defaults. `/tmp/dadeto-6nik-focused.log`.
- Scoped rerun passes all24tests, lint/parse/zero-clone checks and reports no
  uncovered lines or branches in the verifier: `/tmp/dadeto-6nik-impact.log`.
- All11 split local static gates pass after focused tests; compiler contracts reject
  omitted filesystem/root or permission. `/tmp/dadeto-6nik-static.log`.
- Actual verifier output is byte-identical before/after injection:27Terraform
  packages,707reachable modules,1227imports. Logs
  `/tmp/dadeto-6nik-verifier-{before,after}.log`.
- Static/cloud builds and deployment closure are evaluated separately; exact
  terminal receipts are retained below. No production request or deployment is
  invoked by these checks.

Whole-module mutation uses `docs/quality/cloud-package-verifier.stryker.config.mjs`
with static evaluation enabled and100% threshold. Its first225-mutant run is
pending; do not claim mutation acceptance before a terminal exact-source report.
Keep this child open until required mutation and exact pushed Full Check succeed.

Next time, put all ambient defaults in the local wrapper, pin explicit-undefined
compatibility, and use non-native path/builtin fixtures to detect hidden platform
coupling. Preserve current traversal ordering when the loop is dependency wiring.
The broader builtin prohibition, typed boundary work and namespace migration stay
open under the parent; removing imports alone does not prove their completion.

## Initial landing evidence and mutation follow-up

Static/cloud builds and deployment closure pass; the actual verifier still reports
27packages707modules1227imports. The first complete mutation run exits1 at88%:
225mutants (16static),194Killed,27Survived,4Timeout. Retain
`reports/mutation/cloud-package-verifier.initial.json` and
`/tmp/dadeto-6nik-mutation-initial.log`. This is a failed mutation gate, not
acceptance. The four timeouts remove worklist progress/termination; record their
classification honestly and keep timeouts unchanged.

Survivors identify missing exact missing-entry/root-directory cases, nonzero
summary import totals, named reexports, Terraform whitespace variants, AST require
shape/metadata cases, and redundant AST filter/default logic. The same Bead owns
a mutation-driven hardening follow-up; keep its100% threshold/static evaluation.
No source/mutant suppression is appropriate. Current source is landed with local
passing checks while this deeper validation remains explicitly open.

Actual static import audit leaves six modules /14native imports; this is not a
proof of global host independence. Parent enforcement/preparation/migration remain.

## Mutation-driven AST hardening

Add exact missing-entrypoint/root-directory/named-reexport/whitespace and nonzero
summary cases, plus synthetic AST cases for array metadata, ignored position/source
fields and incomplete/non-require call shapes. Consolidate child filtering at the
existing worklist pop boundary: enqueue unknown property values, then filter them
once before node inspection. Remove the arbitrary empty-string fallback for the
private declaration-type set; `Set<unknown>.has` safely rejects absent node types.
These changes remove redundant logic while retaining traversal/report semantics.

All38focused tests pass and actual verifier output remains byte-identical. The
first annotation used ReadonlySet, which checkJs accepted but JSDoc lint did not;
use supported Set<unknown>. Stop the obsolete-source mutation run with SIGINT
only after verifying executable, workspace and stdout log descriptor. Its130exit
is not acceptance evidence; the cancelled log is retained.

The next run and scoped coverage failed from ENOSPC before meaningful evaluation:
/tmp was a full2GiB tmpfs. Remove only the completed clean-install probe's761MiB
node_modules after verifying its retained success receipt, keeping manifests,
backport source and all evidence. Leave the shared Jest cache alone. Rerun under
workspace storage using:

```sh
mkdir -p reports/tmp/package-verifier
TMPDIR="$PWD/reports/tmp/package-verifier" npm run check:impact:run -- --files src/core/local/cloud-function-package-closure.js
TMPDIR="$PWD/reports/tmp/package-verifier" node --experimental-vm-modules node_modules/.bin/stryker run docs/quality/cloud-package-verifier.stryker.config.mjs
```

The recovered scoped evaluator passes38tests, source coverage has no uncovered
lines/branches, and lint/parse/zero-clone checks pass. All11split static gates,
static/cloud builds and27package closure pass. Logs:
`/tmp/dadeto-6nik-hardening-{focused,impact,static,build,cloud-build,verifier}.log`.
Whole217-mutant final-source validation is separately tracked to terminal; do not
claim an all-Killed or zero-timeout result from a live progress counter.

## Injection CI receipt

Full Check40656554151 succeeded atea37cfd. Artifact12802138603 confirms1,075suites /
8,300tests all pass, all four global metrics100% and verifier coverage100% for every
metric. Report `/tmp/dadeto-full-check-40656554151/coverage/check-full-report.md`.
This validates the injection commit, not the subsequent AST hardening; the owning
Bead remains open for final mutation plus exact hardened-commit Full Check.

## Terminal hardening mutation receipt

The complete final-source gate exits0 at100%: **217/217 detected**, comprising
210Killed and7Timeout, with all16static mutants evaluated and no survivors,
ignored or uncovered mutants. Seven replacements remove/extend a worklist loop or
weaken the primitive-node guard, causing non-termination (strings otherwise enqueue
their own characters). Keep those timeout classifications explicit; this is not
217killed assertions or a zero-timeout result. No timeout budget was increased.

Report `reports/mutation/cloud-package-verifier.json` embeds the exact final
source; summary `reports/mutation/cloud-package-verifier-summary.json` records
all timeout IDs/locations/replacements and source SHA-256
`f4f4404c0fe5c7bacafd93ce2cd4fcff9a002919ac575dbbeb4ad54cf0cea618`.
Log `/tmp/dadeto-6nik-hardening-mutation.log`. The217-mutant count reflects removed
redundant logic; no mutation/source exclusion was added. All38focused cases,
recovered scoped coverage without gaps,11split local static gates, static/cloud
builds and actual unchanged archive verification pass. Await the hardened commit's
exact Full Check before closing the child; initial injection CI is separate.
