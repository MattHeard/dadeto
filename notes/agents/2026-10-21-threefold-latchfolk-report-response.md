# THREEFOLD Latchfolk report response

- Unexpected hurdle: the shared Beads Dolt database remained locked across the workspace restart, blocking the loop contract and closure updates.
- Diagnosis: retried the normal Beads command and direct `--no-daemon` mode; both reported an active lock, while the local process list showed no Beads/Dolt process. Avoid modifying or deleting the lock without a supported recovery path.
- Chosen fix: derive the watchkeeper's report response from the saved Iri lead, reported closure, and surviving Latchfolk outcome; add regression coverage for save/import, missing lead, road departure, and lost residents. Record the evidence in the toy acceptance docs while keeping Bead closure pending.
- Next-time guidance: retry Beads after another process/workspace releases the shared database, then attach the exact local and GitHub results to the owning Bead and close it. Keep the Rank 3 spec active; continue with its next unchecked or clearly actionable campaign slice before moving to Rank 4.
