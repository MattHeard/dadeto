Unexpected hurdle: the `tsdoc` checker stopped failing in the ledger-ingest toy cluster once the obvious type holes were fixed, but the remaining errors were spread across several unrelated build/cloud files, which made the repo feel noisy even after the local slice improved.

Diagnosis path: I reran `npm run tsdoc:check` after each small batch to confirm which files still dominated the output, then used the top repeated files to decide whether a fix belonged in the toy layer or whether it was really part of the broader backlog.

Chosen fix: tightened the ledger-ingest helpers, `realHourlyWage`, `cozyHouseAdventure`, `browserToysCore`, and `realtimeVoicePrototype` with narrower runtime guards and explicit casts so the checker could move past the browser/toy layer.

Next-time guidance: continue with the remaining `src/core/build/*` and `src/core/cloud/*` failures in a separate slice, because they now form the main blocker set and should be handled independently from the toy cleanup work.
