# Stryker survivor reporter

- Unexpected hurdle: the mutation run reports survivors in progress output, but its JSON report is only written after completion.
- Diagnosis: Stryker reporters receive `onMutantTested` events; the built-in event recorder was broader than needed.
- Chosen fix: added a local reporter that appends each `Survived` result immediately to `reports/mutation/surviving-mutants.jsonl`.
- Next-time guidance: source `/home/matt_mattheard_net/.nvm/nvm.sh` before Node tooling; use the JSONL artifact when a long run is interrupted.
