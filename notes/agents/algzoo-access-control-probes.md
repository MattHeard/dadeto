# AlgZoo access-control probes

- Hurdle: the preregistration required canary-leakage checks, while existing tests only checked map filtering and held-out isolation in separate assertions.
- Diagnosis: the production-shaped paired runner already records retrieval decisions and sends only filtered map entries to each injected investigator adapter; the missing evidence was a single end-to-end synthetic canary assertion.
- Fix: exercise treatment-only and future-treatment canaries through both arms, inspect investigator requests and stored access logs, and document the boundary of this in-process evidence.
- Next time: before pilot launch, run the same probes against the actual configured provider and storage ACLs; retain hashed raw logs and inspect that no canary or held-out content reached prompts. Unit tests alone do not establish remote isolation.
