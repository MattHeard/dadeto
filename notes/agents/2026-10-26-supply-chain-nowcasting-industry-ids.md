# Supply-chain nowcasting optional industry IDs

- Loop: carry optional opaque organization, offering, process, input, output, and relationship IDs through scenario JSON and CSV while keeping them outside the calculation.
- Unexpected hurdle: the first changed-core impact run found a jscpd clone between the new graph-reference type guard and the agricultural-rover reference guard.
- Diagnosis: inspected the exact clone locations in `reports/duplication/jscpd-report.json`; the behavior was equivalent but the repeated multi-part object guard exceeded the configured clone threshold.
- Chosen fix: use the explicit `[object Object]` tag check for this JSON metadata boundary, preserving null/array/primitive rejection without duplicating the rover guard.
- Evidence: focused planner and presenter Jest passed 2 suites / 95 tests; changed-core coverage passed with zero uncovered lines or branches; jscpd passed with zero clones; `npm run build` and `npm run manuals:check` passed. Focused Stryker completed with 389 killed, 59 survived, and 1 timed out across 449 mutants; no static mutants. The subsequent `npm run check` passed all 10 gates, including six serial Jest shards, lint, static checks, duplication (0 clones), manuals, and audit.
- Stryker follow-up: inspect `reports/mutation/mutation.json`; survivors include feasible-capacity comparisons, validation issue strings, and boundary conditions. The timeout is an assignment mutation in the daily simulation loop. The command exited zero, but survivors mean these behaviors have weaker mutation evidence than the line/branch coverage indicates.
- Next-time guidance: check the impact duplication report immediately when adding a validator; keep optional catalog IDs opaque and avoid requiring external ontology lookup.
