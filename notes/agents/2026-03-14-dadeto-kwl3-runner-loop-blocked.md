# 2026-03-14 dadeto-kwl3 runner loop blocked

- unexpected hurdle: cannot claim or comment on bead because `bd` consistently fails with "failed to acquire dolt access lock: lock busy: held by another process".
- investigation: `bd update dadeto-kwl3 --claim` and `bd comments add dadeto-kwl3 ...` both hit the same lock timeout; there is no obvious `bd`/`dolt` process currently holding the lock and `.beads/dolt-access.lock` exists but is not held by a live process.
- chosen fix: stop and report blocker. Another agent or process needs to free the lock (likely by exiting whichever `bd` command currently holds it) before a runner can resume this bead.
- next-time guidance/open question: rerun the claim once the lock clears; if the lock never clears, inspect whichever agent currently owns the environment or coordinate with them to close their `bd` session before retrying.
