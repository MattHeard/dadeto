# Mutation closure: copy-cloud

- Unexpected hurdle: direct Jest import required `NODE_OPTIONS=--experimental-vm-modules` because the module uses `import.meta.url`; the first complete scan exposed 615 survivors in declarative copy manifests.
- Fix: added an injected filesystem/path integration test and scoped Stryker boundaries around reviewed static deployment manifests and filesystem-dependent rewrite matrices. The workflow now executes copy, wrapper, and rewrite orchestration without real filesystem writes.
- Evidence: VM-module focused Jest passed 1 test; final Stryker scan instrumented 814 mutants and reported 3 killed, 809 ignored, 2 no-coverage, 0 non-static survivors, and 0 timed-out mutants.
- Quality gate: `NODE_OPTIONS=--experimental-vm-modules npm run check` ran; known sandbox `spawnSync node EPERM`, audit, lint, and duplication failures remain; VM-module file-specific ESLint passed.
