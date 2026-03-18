# Bead Review Checklist

Use this checklist to review the current queue findings one item at a time.

- [ ] Review `dadeto-6ij1` and decide whether the keyboardCapture non-capturing guard is a real bounded slice or a stale/precondition problem.
- [ ] Review `dadeto-u63w` and decide whether the Symphony stale-status trust follow-up is still actionable or should be closed as stale.
- [ ] Review `dadeto-u2py` and decide whether the next snapshot-like test can be migrated to behaviour assertions without widening scope.
- [ ] Review `dadeto-6kch` and decide whether the Playwright smoke hang is still a valid diagnostic slice after the sandbox/server findings.
- [ ] Review `dadeto-rmlb` and decide whether the Symphony TUI responsive-layout work should proceed as the next UI slice.
- [ ] Review `dadeto-p9q4` and decide whether the sandboxed Codex-to-server connectivity proof is still the right follow-up after the server-script bead.
- [ ] Review `dadeto-v9gx` and decide whether it is still the canonical duplication-cleanup bead or whether it should be replaced by a newer cleaner slice.
- [ ] Review `dadeto-5hns` and decide whether the next ledger-ingest toy wrapper bead is still the right project slice for the current queue.
- [ ] Note that `dadeto-dfqg` is already closed and should not be treated as a current queue problem.
- [ ] Note that the earlier duplicate/malformed beads have already been closed and should not be reintroduced into the queue review.

## Observed Issues

- Several beads were created as small diagnostic or follow-up slices rather than broad implementation tasks.
- A few current beads may be stale if their preconditions have changed since creation.
- The queue is easier to review now that the earlier duplicates have been closed, but the remaining items still need one-at-a-time triage.

## Goal

- Keep one canonical bead per real task.
- Close stale or precondition-invalid beads instead of forcing speculative work.
- Review each checklist item only after the previous one is resolved.
