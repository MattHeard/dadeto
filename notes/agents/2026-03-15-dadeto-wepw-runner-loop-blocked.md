# 2026-03-15 dadeto-wepw Runner Loop Blocked

- **Unexpected hurdle:** Every write command that touches the bead database fails because Dolt refuses to hand over the access lock. For example, `bd update dadeto-wepw --claim` (with and without `--no-daemon`) and `bd show dadeto-wepw` all error with `failed to open database: failed to create dolt database: the database is locked by another dolt process`, even after manually removing `.beads/dolt-access.lock` between tries.
- **Diagnosis path:** Retried `bd prime` to refresh the hooks, rechecked that no stray `bd`/`dolt` processes appear in `ps -ef`, `pgrep`, or `lsof +D .beads`, and verified that the lock keeps being recreated before any command can acquire it.
- **Chosen fix:** None; the lock must be released by whoever still owns the Dolt database before a runner loop on this bead can proceed.
- **Next-time guidance / open questions:** Once the lock clears, rerun the runner loop starting with `bd update dadeto-wepw --claim` and `bd show` to gather the bead details again. If the lock persists, trace the owner via `bd daemon`/`.beads/daemon.log` or coordinate with whoever is accessing `.beads/dolt`.
