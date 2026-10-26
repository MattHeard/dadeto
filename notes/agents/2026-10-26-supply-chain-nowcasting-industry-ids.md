# Supply-chain nowcasting optional industry IDs

- Loop: carry optional opaque organization, offering, process, input, output, and relationship IDs through scenario JSON and CSV while keeping them outside the calculation.
- Unexpected hurdle: the first changed-core impact run found a jscpd clone between the new graph-reference type guard and the agricultural-rover reference guard.
- Diagnosis: inspected the exact clone locations in `reports/duplication/jscpd-report.json`; the behavior was equivalent but the repeated multi-part object guard exceeded the configured clone threshold.
- Chosen fix: use the explicit `[object Object]` tag check for this JSON metadata boundary, preserving null/array/primitive rejection without duplicating the rover guard.
- Evidence so far: focused planner and presenter Jest passed 2 suites / 95 tests; changed-core coverage passed with zero uncovered lines or branches; jscpd passed with zero clones; `npm run build` and `npm run manuals:check` passed. Focused Stryker and the full local check are still running/pending.
- Next-time guidance: check the impact duplication report immediately when adding a validator; keep optional catalog IDs opaque and avoid requiring external ontology lookup.
