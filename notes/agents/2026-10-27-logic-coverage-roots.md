# Keep migrated logic visible to coverage and reports

Bead: dadeto-hhlj. Parent: Rank11 typed logic architecture.

- Hurdle: new namespace files would disappear from global enumeration, scoped
  coverage and changed-file reports while individual tests still passed.
- Diagnosis: nine red cases demonstrated the omissions, including a scoped
  success with missing new-root coverage. A tighter metadata-error fixture
  showed that existsSync could silently treat an unreadable root as absent.
- Fix: shared immutable measured roots and a typed JavaScript path predicate;
  use it in Jest/serial discovery/impact/reporting. Optional future roots use
  statSync with throwIfNoEntry:false; read/metadata errors propagate. Legacy core
  remains required. Untested modules receive zero coverage, not omission.
- Local evidence: five focused suites85 tests pass; check:impact:run on the
  three changed core modules passes80 tests with no uncovered lines/branches,
  ESLint/core parse and0 clones. The aggregate first failed six test-comment
  JSDoc warnings; corrected multiline docs, then npm run check -- --skip-tests
  passed10/10 static gates. Tests/coverage were run explicitly before that static
  aggregate, not omitted from the loop. Build, build:cloud and cloud-package
  verification passed; logs /tmp/dadeto-hhlj-build.log and
  /tmp/dadeto-hhlj-cloud-build.log, /tmp/dadeto-hhlj-cloud-packages.log.
- Mutation: reproducible docs/quality/logic-source-paths.stryker.config.mjs
  kills14/14, including static mutants; no survivor/timeout. Report:
  reports/mutation/logic-source-paths.json. Its sandbox selects only this focused
  source/test and required configs; global mutation settings are unchanged.
  The initial temporary config used a deprecated files option; the retained
  harness uses ignorePatterns and enforces100%.
- Next: extend the remaining quality roots before moving any existing module.
  Classification/reporting alone does not mean lint/parse/mutation/clone/global/
  dependency/thin gates cover new namespaces. Record exact-head Full Check
  separately; synthetic walker/config fixtures are not a repository-wide run.
