# Git deletion evidence at the coverage boundary

Owning bead: `dadeto-0nth`; follows first source relocation `dadeto-topt`.
The original diagnostic called the deleted classifier path uncovered even though
its actual replacement was measured at all-four 100%. Do not restore a forwarding
file or exempt absent new/existing sources to remove that diagnostic.

Use `git diff --name-status -z --no-renames`: paths alone lose deletion evidence,
and rename detection introduces a different variable-length record grammar.
`src/logic/boundary/local/git-changes.js` accepts unknown process output and
returns a complete typed result or rejection. Empty output is a valid empty
comparison. A/M/T/U records retain paths; D also records deletion candidates.
Truncated records, missing paths and unsupported statuses reject the entire
comparison. Names retain spaces, tabs and newlines; path safety remains owned by
the impact planner, which falls back for unsupported/unsafe paths.

The full report compares immutable commits and passes successful Git deletion
evidence separately from all changed paths. It reports deletions explicitly and
still names any missing surviving files. The actual entrypoint is exercised in
a temporary Git repository with a moved measured file and an unmeasured new file.

Local impact discovery must also reconcile staged/base deletion candidates with
current worktree existence: a staged deletion may have been restored or recreated
without staging. No existence callback means absence is unknown. Explicit
`--files` inputs do not acquire a deletion exemption. Confirmed source deletions
retain their changed paths and select all unit tests conservatively; deletion-only
changes must never become a clean/no-tests result. Fallback runs do not claim
scoped coverage. Existing missing-new/existing scoped coverage guards remain.

Focused evaluation collects all four metrics for the parser and both complete
consumer modules. The full-module Stryker configuration is
`docs/quality/git-deletion-evidence.stryker.config.mjs`, with static mutation enabled
and threshold 100. Reports and terminal outcomes belong in the owning bead/PR;
starting either evaluator is not acceptance. This loop is one real boundary parser
and truthful consumer integration, not completion of the coverage-evidence JSON
parser, report migration or the remaining legacy tree.

The first clone evaluator caught repeated collection-error/fallback records.
Centralize those complete outcomes instead of suppressing clone detection;
the exact rerun reports zero clones. Five focused suites pass 98 tests with
all four metrics at 100% on all three changed logic modules.

The original implementation at `4dffaf1c0028eddaae46e59a96691a3e85bdb205`
independently produced 576 explicit CLI contracts and 117 complete public
report/Markdown contracts before their hashes were saved. Every original/current
outcome matched. Fixture `test/fixtures/typed-logic/legacy-contracts.json` has
SHA-256 `02c3f95751398f6b11a40ae5b5c7f0cc2ee51ccd78639ddb5db4ad0b8dec933f`.
The reusable fixture modules accept an implementation's exports; run them against
an isolated checkout of that baseline to reproduce the oracle, never regenerate
expectations from a failed current implementation. Explicit CLI cases deliberately
exclude changed Git-discovery grammar. New deletion behavior has separate real-Git
and explicit runner/report assertions. These contracts observe public results,
full CLI output, permission forwarding, subprocess arguments/options and actual
coverage selection, not private helper names or source spelling.

Initial whole-module mutation exposed one equivalent parser mutant: removing the
odd-field-count precheck leaves the same rejection, because the last unmatched
status has no path and reaches the existing missing-path guard. Remove that
duplicate precheck rather than adding a mutation exclusion. An independent
comparison with committed parser `d959b14b03992ba2b0b38bf6c311dd8aae773a39`
checks every sequence of zero through six tokens drawn from empty, A, D, M, T,
U, Q, path and a newline-containing name, with and without a trailing NUL.
All 1,195,742 outcomes match; ordered corpus SHA-256 is
`264d23ec14d4231d00721a5051c9bc82ea33df4f88f7d077346914626838fb12`.
Log: `/tmp/dadeto-0nth-parser-equivalence.log`. All six focused suites / 792
tests then pass with all four changed-module coverage metrics at 100%; see
`/tmp/dadeto-0nth-parser-hardened-tests.log`. Complete consumer mutation
hardening remains separate acceptance; the original baseline report is retained
as `reports/mutation/git-deletion-evidence.initial.json` and must not be called
a passing run.
