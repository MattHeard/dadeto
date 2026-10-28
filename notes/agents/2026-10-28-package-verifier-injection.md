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
