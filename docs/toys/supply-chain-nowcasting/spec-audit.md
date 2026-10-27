# Supply-chain live-spec implementation audit

Source: [Rank 10 Notion spec](https://app.notion.com/p/3fa700afc3018109a2a4c42549feef2e), audited 2026-10-27. Owning Bead: `dadeto-fbd1`; shared artifact retention: `dadeto-en6p`. The requirement map below includes inspected current-code browser artifacts and terminal Full Check/cleanup evidence.

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
| Useful sample response under two minutes without signup | Current-code cloud run `40487647737` at `5b97143` retained artifact `e2e-t-239cf0a8` (12728936135). The case passed in846ms; its timed one-click task took544ms. The PNG and inline JSON were inspected: baseline30 units/50¢, first feasible alternate avoids30 with0 remaining/400¢, and the2-day signal is explicitly hypothetical. Capacity/arrival/minimum-warning/shortfall/cost columns and advisory notice are readable. This establishes rendered content and automated completion; no human comprehension study is claimed. |
| Explainable deterministic ranking and hand-computed costs/shortfall | Pure planner fixtures and presenter labels above; the current focused planner/presenter evaluator passes 119 tests with full changed-core lines/branches. |
| Capacity/lead/warning constraints | Model invariants above plus isolated equality/over-limit, shared-allocation, last-day, route-floor and warning-boundary regressions. |
| Explicit errors for invalid IDs, directions, units and impossible input | Validator tests cover null records, duplicate/unknown/blank IDs, unsupported paths/cycles, bad units, invalid quantities/costs/days/reduction, and a nonblank sole missing-ID issue. The model intentionally supports direct supplier-to-destination routes. |
| Auditable export | Baseline/scenario/all-option/criterion/constraint/provenance/uncertainty round-trip tests; no automatic external action. |
| Honest hypothetical UI | Static notice, warning signal, live statuses and footer explicitly distinguish synthetic planning from live forecasts and execution. These labels are asserted by presenter/cloud journey tests. |
| Jest, Stryker and ESLint with existing browser loading | Whole-planner mutation report at `4c12c09`: 486 mutants (461 killed, 24 reviewed survivors, one detected nontermination). Subsequent changed allocation/diagnostic, warning/label and final route/demand helpers killed 26/26, 23/23 and 22/22 mutants respectively. Source-specific coverage is complete; local aggregate/build and current-code Full Check must be terminal before closure. |

Mutation reports are preserved under `reports/mutation/` as `supply-chain-nowcasting-before-allocation.json`, `supply-chain-nowcasting-allocation.json`, `supply-chain-nowcasting-warning.json`, and the latest `mutation.json`. Reviewed earlier survivor rationale is in `acceptance.md`. No mutation exclusions, clone suppressions, IAM expansions or production-chain guard changes were introduced.

The demand/route-arrival loop's aggregate check passed all 10 gates and the build passed. Imported context now follows provenance, horizon, destination, demand and starting stock;48 presenter tests and full scoped coverage passed, along with the local aggregate gate and build. All implementation slices are pushed; the matching Full Check and cloud run succeeded, with screenshot/interaction inspection recorded below. Human enjoyment or customer validation is not inferred from an automated trace.

## Retained current-code browser evidence — 27 October 2026

- Run: [40487647737](https://github.com/MattHeard/dadeto/actions/runs/40487647737),
  exact code `5b97143617eab1c918675f3c1d1f4d16b89d56d0`.
- Retained [artifact12728936135](https://github.com/MattHeard/dadeto/actions/runs/40487647737/artifacts/12728936135):
  `supply-chain-response-plan` PNG `data/dc985079db8907b226bfc5784f82eca7bbd5e8ba.png`,
  SHA-256 `d823735cd61d7fde09ea050d97d545a8da99d047a2cf3798dfb7e087d044ea31`.
- The interaction JSON is embedded inside the HTML report's base64 ZIP file
  `b64ba81f5444190f4560.json`, attachment `supply-chain-interaction-record`.
  Its task elapsed544ms; case duration846ms. All14 browser cases passed with no
  unexpected/flaky/skipped results. Local extracted records are ignored under
  `reports/playtests/gcp-40487647737/`.
- Visual inspection confirms synthetic provenance, assumptions, editable inputs,
  JSON/CSV import/export controls, route capacity/lead/cost/state, ranked response
  feasibility/timing/remaining-demand/cost and advisory-only copy. The comparison
  case checks warning0/1/2 timing, partial-demand warning and reset.
- Exact-code [Full Check40487573780](https://github.com/MattHeard/dadeto/actions/runs/40487573780)
  succeeded. Cloud run40487647737 subsequently completed successfully: the Terraform
  job and final cleanup job both passed their destroy/static-prefix cleanup steps.
  The manual-run production handoff40491417626 was skipped. No production apply
  or paid provider request was needed.
