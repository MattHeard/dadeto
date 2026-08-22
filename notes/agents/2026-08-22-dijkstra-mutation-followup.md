# Dijkstra mutation follow-up

- Initial focused scan of `src/core/browser/toys/2025-12-05/dijkstra.js` instrumented 123 mutants and reported 47 survivors plus 2 timeouts.
- Added direct tests for the pure queue, guard, node-list, neighbor-entry, and distance-map helpers. A second rerun reduced the result to 18 survivors and 2 timeouts, so this file remains intentionally unledgered and incomplete.
- Next step: isolate the remaining guard and queue branches with deterministic helper tests or remove equivalent guard layers; keep the Stryker worker serialized because the two long-running block mutants time out in the broad helper path.
