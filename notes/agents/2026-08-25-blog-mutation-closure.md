# Mutation closure: build/blog

- Baseline: 196 killed, 24 surviving, and 13 ignored mutants.
- Fix: added assertions for copy-message propagation, recursive copies, static-tree success/missing messages, root scripts, process utilities, constants destinations, workflow-bound copying, and returned helper exposure.
- Evidence: focused copy suite passed 37 tests; final Stryker scan reported 217 killed, 16 ignored, 0 surviving, and 0 timed-out mutants.
- Quality gate: `npm run check` ran; known sandbox `spawnSync node EPERM`, audit, lint, and duplication failures remain; file-specific behavior and mutation checks passed.
