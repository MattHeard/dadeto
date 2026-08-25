# Allowed origins mutation scan

- Unexpected hurdle: none; this thin facade had one delegated behavior mutant.
- Diagnosis: the authoritative scan instrumented one mutant and killed it.
- Fix: no production change was needed; the existing environment-resolution assertion covered the delegation.
- Next time: scan thin cloud facades independently from their large shared implementation module.
