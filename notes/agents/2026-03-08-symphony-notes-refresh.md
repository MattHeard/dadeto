# Symphony notes refresh

- Unexpected hurdle: the project note still mixed shipped launch/logging behavior with older pre-launch next actions.
- Diagnosis path: compared `projects/symphony/notes.md` against `tracking/symphony/status.json`, the live ready queue, and recent closed Symphony beads.
- Chosen fix: rewrote the note around the current MVP boundary: ready-bead polling, detached Ralph launch, persisted status/log artifacts, and the remaining finished-run reconciliation gap.
- Next-time guidance: refresh project notes from the live status artifact and open queue first; if the note still says launch is missing while `status.json` shows `activeRun`, the note is already stale.
