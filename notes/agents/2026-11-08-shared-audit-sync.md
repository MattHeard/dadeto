# Shared-checkout audit synchronization

Owner: `dadeto-38xi`; requested before resuming typed-logic task `dadeto-0nth`.

The shared checkout was at `b99387e8b7`, 497 commits behind current main, with
twenty unrelated tracked browser/game edits and additional untracked user work.
Its audit reported 28 entries: two high, 23 moderate and three low. Current main
and the active implementation worktree already reported zero. Do not interpret
this stale checkout as a new default-branch vulnerability regression.

Reuse the published modern-only glob/minimatch and RE2JS patches, the qs override,
compatible body-parser/fast-uri lock resolutions, and the identified licensed
`vendor/deepmerge` security backport. Preserve legacy glob/minimatch consumers.
Copy the published security/API regressions and the Docker vendor COPY needed
before npm ci. Do not copy unrelated main scripts or feature dependencies into
the old checkout. No audit exception or forced tool downgrade is introduced.

The automatic audit-fix candidate refreshed unrelated tooling and produced a
large lock diff. It was not applied to the shared checkout. Start instead from
main's validated lock resolutions, align only the root manifest dependency list,
then let npm validate/prune the lock. The final lock diff is 365 lines, and the
old checkout's scripts are unchanged. An initial clean-install attempt raced the
lock refresh and failed; wait for the lock writer's terminal result before any
dependent install or test.

The bounded lock and clean npm ci both report zero vulnerabilities. The published
security and compatibility suites pass 24 tests, proving actual prototype-poison
protections and the consumed matcher/cancellation/regex APIs. Logs are
`/tmp/dadeto-38xi-bounded-clean-install.log`,
`/tmp/dadeto-38xi-bounded-audit.json`, and
`/tmp/dadeto-38xi-compatibility.log`. Record the local aggregate and shared-checkout
audit/hash verification in the owning bead before closure.

The required isolated `npm run check` is terminal PASS (wrapper0): selected unit
tests and all ten gates on this older source pass, including low-severity audit,
zero clones, lint and TypeScript. `/tmp/dadeto-38xi-check.log` contains the final
outer summary. This local check does not instrument coverage or prove the user's
uncommitted files pass. Before publication, the twenty unrelated tracked hashes
still match the initial shared-checkout snapshot.

Publish this small backport on its own branch before fast-forwarding the shared
checkout to it. Do not pull hundreds of unrelated source commits into dirty user
work. Main already contains the security fixes, so avoid a duplicate default-
branch repair. Main's existing authoritative CI proves its own snapshot; do not
describe it as fresh full-suite/coverage evidence for the old source or the user's
dirty working files. Keep the typed-logic mutation environment unchanged while
performing this operational synchronization.
