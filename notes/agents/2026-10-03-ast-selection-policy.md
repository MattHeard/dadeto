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
