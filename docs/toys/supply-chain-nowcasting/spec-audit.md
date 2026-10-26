# Supply-chain live-spec implementation audit

Source: [Rank 10 Notion spec](https://app.notion.com/p/3fa700afc3018109a2a4c42549feef2e), audited 2026-10-26. Owning Bead: `dadeto-fbd1`; shared artifact retention: `dadeto-en6p`. This is an evidence map, not a claim that pending current-code CI or browser acceptance has finished.

## Scope coverage

| Live requirement | Implementation and inspected evidence |
| --- | --- |
| 1. Standalone synthetic network, documented JSON/CSV paste or upload, no account/API | `src/content/pages/supply-chain-nowcasting/` loads the pure-core presenter. Its sample has two suppliers, lanes, demand, capacities, lead times, costs and a buffer. Presenter tests exercise paste/file import, exact manual CSV, malformed input, and preservation of the active scenario on failure. The browser adapter uses only DOM/local file/download APIs. |
| 2. Disruption inputs, constrained responses and selected ranking | Presenter controls route, severity, duration, warning and ranking. Pure tests hand-calculate recovery, costs, buffers, exact/over-limit route and supplier capacity, and deterministic service-first/cost-first order. |
| 3. Current versus early warning on the same baseline, with actionable timing breakpoints | The comparison test preserves the baseline while warning changes. `minimumWarningLeadDays` is shown/exported; tests cover just below/at the last-day arrival threshold, zero warning, impossible fulfillment, and route-constrained timing. |
| 4. Inspectable capacities, remaining shortfall, costs, assumptions and incomplete-response warning | Network/response tables show capacities, arrivals, timing threshold, feasibility, avoided/remaining shortfall and added cost. Presenter tests exercise partial, absent, infeasible, complete and zero-shortfall cases. Capacity allocation and timing invariants are stated below. |
| 5. Complete advisory export | `makeSupplyResponseExport` preserves scenario, baseline, hypothetical signal, every ranked option, criterion, constraints, provenance and uncertainty. Import/export tests cover the round-trip and error states; new remaining/timing fields are asserted in the exported options. No vendor contact or rerouting operation exists. |
| 6. Optional future industry graph IDs | JSON and CSV accept opaque organization/offering/process/input/output/relationship references. Tests reject malformed IDs and prove results are unchanged by metadata, including sparse references. No ontology lookup is required. |
| 7. Existing browser integration, pure core, no React/runtime npm package | The standalone app imports `/core/browser/game/supply-chain-nowcasting/page.js`; the presenter imports the pure planner. Site build/manual/catalog tests cover registration and copied assets. No package or paid/cloud runtime is needed by this toy. |

## Model invariants

For each supplier, validation enforces the sum of baseline route allocations at or below supplier capacity. A capacity option must fit both `route maximum - route baseline` and `supplier capacity - all supplier baseline allocations`; adding that option therefore cannot exceed either declared bound. Exact and above-limit fixtures isolate both bounds and shared allocations.

A capacity option's fulfillment lead is the maximum of its own and its route's lead; a buffer uses its own lead. Arrival is the nonnegative decision day plus fulfillment lead. Increasing a required lead or reducing warning cannot cause earlier arrival. Candidates arriving beyond the horizon remain explicitly infeasible. Tests exercise the inclusive horizon, warning breakpoint, route floor and independent buffer timing.

Each feasible candidate reports its actual simulated remaining shortfall; each infeasible candidate retains baseline shortfall. The presenter warns for positive baseline shortfall unless a feasible option has zero remainder. It does not warn when the baseline already meets demand.

## Acceptance evidence and outstanding proof

| Acceptance item | Evidence / remaining proof |
| --- | --- |
| Useful sample response under two minutes without signup | Earlier cloud run `40358398354` passed the supply-chain journey in 903 ms, but its report upload failed after all 14 browser cases passed. Final-code screenshot and interaction-record retention must still be observed after the create-only uploader repair. Do not use that earlier run to certify later domain changes. |
| Explainable deterministic ranking and hand-computed costs/shortfall | Pure planner fixtures and presenter labels above; the current focused planner/presenter evaluator passes 119 tests with full changed-core lines/branches. |
| Capacity/lead/warning constraints | Model invariants above plus isolated equality/over-limit, shared-allocation, last-day, route-floor and warning-boundary regressions. |
| Explicit errors for invalid IDs, directions, units and impossible input | Validator tests cover null records, duplicate/unknown/blank IDs, unsupported paths/cycles, bad units, invalid quantities/costs/days/reduction, and a nonblank sole missing-ID issue. The model intentionally supports direct supplier-to-destination routes. |
| Auditable export | Baseline/scenario/all-option/criterion/constraint/provenance/uncertainty round-trip tests; no automatic external action. |
| Honest hypothetical UI | Static notice, warning signal, live statuses and footer explicitly distinguish synthetic planning from live forecasts and execution. These labels are asserted by presenter/cloud journey tests. |
| Jest, Stryker and ESLint with existing browser loading | Whole-planner mutation report at `4c12c09`: 486 mutants (461 killed, 24 reviewed survivors, one detected nontermination). Subsequent changed allocation/diagnostic, warning/label and final route/demand helpers killed 26/26, 23/23 and 22/22 mutants respectively. Source-specific coverage is complete; local aggregate/build and current-code Full Check must be terminal before closure. |

Mutation reports are preserved under `reports/mutation/` as `supply-chain-nowcasting-before-allocation.json`, `supply-chain-nowcasting-allocation.json`, `supply-chain-nowcasting-warning.json`, and the latest `mutation.json`. Reviewed earlier survivor rationale is in `acceptance.md`. No mutation exclusions, clone suppressions, IAM expansions or production-chain guard changes were introduced.

The demand/route-arrival loop's aggregate check passed all 10 gates and the build passed. Static sample horizon/demand/destination context still needs to follow custom imports before the next cloud run. After it passes, push this slice, run current main through the isolated cloud test workflow, inspect retained screenshot and elapsed-time JSON, record current-SHA Full Check separately, then reconcile the live Notion acceptance and refresh the ranked queue. Human enjoyment or customer validation is not inferred from an automated trace.
