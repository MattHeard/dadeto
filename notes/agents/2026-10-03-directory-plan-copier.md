# Directory-plan copier ownership

The strict report paired the trailing calls in the constants and static-content
copy wrappers. Constants and browser trees now use declarative definitions bound
by `createConfiguredDirectoryTreeCopier`. It shares path/tuple materialization
and delegates to `createDirectoryTreeCopier`, which binds a plan builder to the
existing recursive-copy pipeline. Static content uses the latter factory with
its existing plan builder. Public copy helper names remain unchanged.

The regression copies a nested constants file with a separate caller-supplied
copier. It checks paths, undefined return, success logging, and that the raw IO
copier is not accidentally invoked. Existing missing-directory tests still pass.

The initial wrapper extraction reported 34 before formatting, but its full check
returned to 35: nested tuple-literal endings introduced a replacement pair.
Sharing tuple materialization alone also left a pair of literal-builder endings.
Removing those redundant wrappers and binding the definitions directly resolved
the actual ownership issue. Always run formatting before the report when using
the strict 14-token detector; the aggregate runner can expose timing differences.

Final focused evidence: `.tmp/copy-plan-configured-tests.log` passes 38 tests with
exact 100% coverage for `src/core/build/blog.js`. After explicit lint completed,
`.tmp/copy-plan-configured-static.log` records all non-duplication gates passing
and 34 strict clones (previously 35). Detector settings and ignore rules are
unchanged. Build evidence: `.tmp/copy-plan-configured-build.log`. Aggregate
checkpoint: `.tmp/clone-goal-34-configured-full-check.log` terminated exit 1,
with all 21 test shards passing and only duplication failing in the outer
ten-gate summary (34 clones). Exact global coverage: lines 20333/20333,
statements 21187/21187, functions 7073/7073, branches 10203/10203. Inspect the
outer summary and terminal exit, not just the test runner's inner summary.

Next time, use a plan-builder factory for wrappers that differ only by their
directory plan. Keep recursive filesystem behavior in its existing owner rather
than duplicating traversal in a new convenience wrapper. Remaining clones are
tracked by `dadeto-aaou`, which stays open until the full goal is achieved.
