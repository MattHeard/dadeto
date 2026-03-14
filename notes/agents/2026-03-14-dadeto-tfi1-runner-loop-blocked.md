# 2026-03-14 dadeto-tfi1 Runner Loop Blocked

- **Unexpected hurdle:** `bd update dadeto-tfi1 --claim --status=in_progress` always errors with `failed to open database: failed to create dolt database: the database is locked by another dolt process`, even after running `bd prime`, trying `--no-daemon`, and removing `.beads/dolt-access.lock`.
- **Diagnosis path:** Re-ran `bd prime` so the daemon restarted, confirmed `.beads/dolt-access.lock` reappears but there are no visible `bd`/`dolt` processes in `ps -ef`, `pgrep`, or `lsof` results, and repeated the `bd update` claim which still hits the lock message.
- **Chosen fix:** None yet; the lock owner still needs to release the Dolt database before a bead loop can start.
- **Next-time guidance / open questions:** Once whoever is holding the `dolt` access lock drops it (or the lock file is safely removed), rerun the runner loop; if the lock keeps reappearing, inspect the `bd daemon`/`dolt` process tree or `.beads/daemon.log` to see what is holding the database busy.
