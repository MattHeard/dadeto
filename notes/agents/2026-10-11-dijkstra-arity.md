# Dijkstra search parameter-bag cleanup

- Unexpected hurdle: helper contract tests call the internal graph helpers directly, so the refactor required updating those existing calls to match the new explicit grouped inputs.
- Diagnosis: the two oversized payloads mixed graph edge configuration, current/candidate nodes, and mutable queue state.
- Fix: neighbor expansion now receives the node list, current node, graph edge context, and mutable search state separately. Candidate edge construction takes the current node, neighbor, graph context, and distance bound.
- Evidence: target no-cache scan is clear in `.tmp/dijkstra-arity.json`; Dijkstra suite passed (1 suite, 23 tests); TSDoc passed; elevated `TMPDIR=/home/matt/dadeto/.tmp npm run check` passed all 10 evaluators with 0 clones and 0 audit vulnerabilities (`.tmp/dijkstra-arity-check.log`). Refreshed global inventory `.tmp/parameter-bag-global-after-dijkstra.json`: 54 findings across 48 files, down from 56.
- Next-time guidance: update direct helper contract tests when signatures change, while keeping the algorithm's graph and mutable search state as distinct concepts.
