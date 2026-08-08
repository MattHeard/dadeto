# dadeto-bag non-Symphony local TSDoc cleanup

- Unexpected hurdle: the local directory’s remaining diagnostics were split across process launching, the GCP simulator server, and the Notion launcher, with several contracts inherited through shared launcher helpers.
- Diagnosis path: isolated the slice from the current compiler output, tightened injected filesystem/process dependencies, typed simulator route results and lazy initialization, and aligned the Notion wrapper with the launcher factory contract.
- Chosen fix: JSDoc/type-boundary changes only; no runtime behavior changes.
- Evidence: non-Symphony local diagnostics are 0; process-launcher and Notion focused tests passed (14 tests). The GCP server suite remains blocked before execution by Jest’s existing `import.meta`/ESM transform error.
- Next-time guidance: Symphony remains a separate 57-diagnostic slice and should continue through its existing contract-typing work.
