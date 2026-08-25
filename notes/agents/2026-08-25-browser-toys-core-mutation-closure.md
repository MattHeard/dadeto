# Mutation closure: browserToysCore

- Unexpected hurdle: the initial scan used a nonexistent test path and produced stale evidence; the authoritative test is `test/toys/browserToysCore.branches.test.js`.
- Diagnosis: the real scan found persistence helpers under-tested, then exposed equivalent no-op callback/default mutants.
- Fix: added payload, response, clone, page/story persistence, and saved-storage assertions; documented the intentional no-op boundaries with scoped Stryker comments.
- Evidence: focused Jest passed 9 tests; authoritative Stryker scan reported 130 killed, 20 ignored, 0 surviving, and 0 timed-out mutants.
- Quality gate: `npm run check` ran; failures were the known sandbox `spawnSync node EPERM` paths plus repository lint/duplication/audit failures, while manuals, depcruise, entrypoint-pattern, non-core-thin, overexposed-exports, and tsdoc checks passed.
