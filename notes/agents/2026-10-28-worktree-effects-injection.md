# Worktree runner platform boundary

Bead `dadeto-tx59`, child of `dadeto-e1oz`; Rank 11 remains Active / Partial.

## Change and diagnosis

The runner's path adapter was already required, but core still imported native
filesystem/process launchers and could fall back to host process/environment.
Generated configuration read host STRYKER variables even when a caller supplied
an independent environment. Machine logs also read the native clock.

Require explicit filesystem, launcher, environment, clock and invocation-boundary
dependencies. The existing local entry point supplies them. Filesystem writes,
process launches, child event subscriptions, clock queries and logging receive
the invocation's AllowEffects value. Preserve the zero-argument public handle,
config defaults, exact lifecycle/environment overrides, report destinations and
best-effort cleanup. The exported internal runCommand now requires permission
and an explicit environment. Core contains no native imports or host globals;
its dependency types describe only the consumed operations.

A generic object adapter loses Node's overloaded `once` signature: TypeScript
sees only its final `spawn` event overload. Use the named worktree adapter with
explicit error/exit signatures. It preserves child receiver, original arguments,
synchronous errors and exposes only the classified subscription operation.
Adding permission also exposed a five-parameter helper. Bind filesystem/launcher
through the existing factory closure instead of hiding excess arguments in a bag.

## Regression harness

Retain controlled subprocess fixtures and two-second test-only completion bounds.
Native process fallbacks stay blocked; no actual worktree lifecycle is invoked.
Configuration tables now inject their STRYKER inputs instead of changing global
environment. Direct tests verify distinct invocation permissions at every effect,
exact injected timestamps, contradictory host environment isolation and rejected
boundary behavior. Wrapper tests mock the real platform operations, proving the
composition imports without launching work and forwards arguments/results.
Compiler contracts reject missing permission for filesystem, launch and subscribe.

Focused seven suites / 44 tests pass. The scoped evaluator passes 39 runner tests,
changed-source lint, parsing and zero-clone checks; runner coverage has no uncovered
lines or branches. CheckJs and static build pass. Logs:
`/tmp/dadeto-tx59-{focused,types,impact,static,build,mutation}.log`.

The split local aggregate (`npm run check -- --skip-tests`, after focused tests)
ran all ten static gates: nine pass, audit alone fails five low entries through
Jest's deepmerge dependency. Newly reviewed GHSA-gcqx-w48m-w2h4 has no patched
published release (latest4.3.1). Separate Bead `dadeto-sxun` owns real remediation;
do not suppress audit or accept npm's blind major Jest downgrade as a fix.
The architecture child remains open until the full required validation succeeds.

The actual Acorn static-import census now reports eight modules / 18 built-in
imports, in `reports/mutation/logic-builtins-remaining.json`. This excludes
JSDoc/dynamic imports and is not a global purity proof. The broader dependency
gate observability, parse/thin namespace preparation and migration remain open.

Whole-module mutation and asynchronous Full Check receipts are recorded below
only after terminal evidence. Static mutants remain enabled and the 100% mutation
threshold is unchanged. Next time, use precisely typed wrappers for overloaded
native methods and keep local-pass, mutation-detection and full-CI claims separate.

## Terminal mutation receipt

Whole-runner mutation exits0 at100%: **144/144 detected**, consisting of140Killed
and4Timeout, with no survivors/ignored/uncovered mutants. Static evaluation is
enabled; none are generated. The four timeouts remove the Promise executor, exit
handler, exit event name or error-settlement handler and leave operations pending.
Record them as timeout detections, not killed assertions. Runtime, test deadlines
and Stryker budgets were not raised. The JSON report's embedded source exactly
matches the module; SHA-256
`5314d93074789b538306e405c389db9387d782049da7e2a67ba85f40a7986643`.
Report `reports/mutation/worktree-runner.json`; exact classifications and source
match in `reports/mutation/worktree-runner-summary.json`; log
`/tmp/dadeto-tx59-mutation.log`. The final static rerun again passes nine gates and
fails only the tracked audit. Full CI remains separate and the child stays open.

## Pushed CI receipt and audit follow-up

Runner commitcab50c4 Full Check40649466701 failed only audit. Downloaded
artifact12799376885 confirms1,071suites /8,261tests all pass and all four global
and runner coverage metrics100%. Overall failure remains failure. Separate
childsxun now supplies a licensed, explicitly identified deepmerge security
backport with actual exploit/compatibility/clean-install probes. Its60focused
cases and all10 split local static gates pass. The repaired descendant Full Check
still must succeed before these quality tasks close; no source/mutation threshold
or exclusion was relaxed. See2026-10-28-deepmerge-security-backport.md.
