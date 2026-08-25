# Handler utils mutation scan

- Unexpected hurdle: none; the small factory had complete focused coverage.
- Diagnosis: the authoritative scan instrumented 4 mutants and killed all 4.
- Fix: no production change was needed; existing validation, mapping, delegation, and return-value assertions were sufficient.
- Next time: scan small adapter factories early because their complete contract is easy to verify.
