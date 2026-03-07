## Symphony queue evidence

- Unexpected hurdle: the first Symphony scaffold selected a bead correctly but did not leave enough operator-visible evidence in `status.json` or the startup log to explain why that bead was chosen from the ready queue.
- Diagnosis path: read the local tracker/bootstrap/status-store flow and compared it with the tightened bead contract, then extended the targeted tests to assert both status payload fields and startup-log contents.
- Chosen fix: extract queue-summary formatting into `src/core/local/symphony.js`, thread that queue evidence through the local bd tracker/bootstrap path, and persist `currentBeadId`, `currentBeadTitle`, `latestEvidence`, and `queueEvidence` in the startup log.
- Next-time guidance: keep pure selection/reporting helpers in `src/core/local/symphony.js`, and treat operator-visible tracker evidence as part of the Symphony contract before adding any scheduler or runner-dispatch behavior.
