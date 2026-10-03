# AST selection policies

The analyzer's Identifier/name/null tail matched its parent-name resolver.
Binding-name selection now uses canonical whenOrNull; traversal uses canonical
isNonNullObject, retaining array acceptance and primitive/null rejection. The first
single-helper refactor created an import clone; sharing the traversal policy avoids
that duplicate without unused imports or syntax-only edits.

The boolean traversal predicate does not narrow TypeScript's optional AST node.
An explicit AstNode assertion after the guard records its runtime guarantee; no
type suppression or repeated guard is needed. Tests preserve direct/default
parameter injection classification and do not guess destructured parameter names.

Evidence: `.tmp/ast-binding-tests.log`, seven tests, exact 100% analyzer coverage.
`.tmp/ast-binding-static.log`, duplication only, 57 to 56 strict clones; type/lint
and other checks pass after guarded narrowing. `.tmp/ast-binding-build.log` passes.
Frozen full acceptance: `.tmp/clone-goal-56-full-check.log`. Detection settings
and ignores unchanged; aaou remains open until zero and terminal full green.

Terminal full `npm run check` exited 1: test suite passed and the outer summary
has ten checks with duplication its sole failure (56 clones). Exact aggregate
coverage in `reports/coverage/coverage-summary.json`: lines 20349/20349,
statements 21198/21198, functions 7055/7055, branches 10222/10222. This continuation
reduced 62 to 56 in six pushed refactors. Start the next loop from the refreshed
JSON report; the overall goal remains active and dadeto-aaou must not be closed.
