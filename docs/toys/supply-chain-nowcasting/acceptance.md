# Supply-chain Nowcasting Acceptance

Define explicit, machine-checkable acceptance criteria and where evidence is stored.

## Machine-Checkable Criteria
- [x] `node scripts/run-jest.js --runInBand --runTestsByPath test/core/browser/game/supplyChainNowcasting.test.js test/core/browser/game/supply-chain-nowcasting-page.test.js test/generator/decisionToolCatalogueLinks.test.js` exits with status 0 and proves the hand-computed sample and browser flow.
- [x] `npm run check` exits with status 0 after each implementation loop.
- [x] `npm run build` exits with status 0 when the standalone page is integrated.
- [ ] Focused Stryker run is recorded and every surviving or timed-out behavioral mutant is classified as killed by a new assertion, equivalent, or intentionally excluded with rationale. Latest run: 486 mutants; 461 killed, 24 survived, 1 timed out. Report: `reports/mutation/mutation.json`; the timeout is an assignment mutation in the daily simulation loop. Capacity, buffer-cost, horizon, route-selection, malformed-record, and scalar validation boundaries now have explicit regression cases; remaining survivors are reviewed below; the missing-ID diagnostic case remains open.
- [ ] Cloud browser acceptance (`test/e2e/supply-chain-nowcasting.spec.ts`) records a sample network and one-click disruption with a useful plan in under two minutes, no signup, clear hypothetical warning labels, and no autonomous action.
- [x] Export contains baseline, warning signal, ranked alternatives, ranking criterion, and all constraints/assumptions; optional JSON and CSV IDs round-trip without affecting calculations.
- [x] Null supplier, route, and mitigation entries return explicit validation issues; multiple valid routes can be selected by disruption and mitigation IDs.

## Evidence Collection
- Command log path: `artifacts/toys/supply-chain-nowcasting/commands.log`
- Generated artifacts:
  - Jest and Stryker reports under configured report paths.
- Latest local aggregate check after the observable-case and cloud-harness additions: `npm run check` passed all 10 gates; all six serial Jest shards passed, lint and static gates passed, duplication reported 0 clones, and manuals validated successfully. `npm run build` also passed.
- Named malformed-record boundary test ensures Stryker's per-test run exercises null supplier, route, and mitigation records and invalid scalar boundaries.
- Mutation report: `reports/mutation/mutation.json`.
- Cloud browser evidence: the new Playwright journey attaches `supply-chain-response-plan` (screenshot) and `supply-chain-interaction-record` (observed results and elapsed time); its first cloud run is pending. This is automated task-completion evidence, not a human comprehension rating.
- Acceptance audit reproduced a shared-supplier defect: two 10-unit routes can deliver 20 units from a supplier capped at 10 units/day. The owning Bead remains active until aggregate capacity is enforced.

## Pass/Fail Rules
- Pass each loop only when its named command succeeds and evidence is recorded on the owning Bead. Full toy acceptance also requires all browser criteria and mutation review above.
- Fail when model output is nondeterministic, violates capacity/lead time, hides invalid data, labels a hypothetical warning as a real forecast, or initiates execution.

## Mutation review — 2026-10-26

The full focused run exercised 66 planner tests and 486 mutants: 461 killed, 24 survived, and 1 timed out. It killed the five prior behavioral survivors for matching-supplier lookup (21, 254, 356), default score ordering (94), and delayed buffer arrival (414). The source remains the planner from `a91b06c`; this loop changes tests and the cloud browser harness.

| Surviving IDs | Review |
| --- | --- |
| 37, 38 | Valid capacity mitigations have a known route and supplier before simulation, so these truthiness terms are redundant for accepted scenarios. |
| 80 | Feasible options already sort ahead of infeasible ones through nonnegative shortfall avoided, then finite cost versus the infeasible infinity sentinel. Removing the separate feasibility comparator preserves this ordering. |
| 119 | Replacing the fallback empty mitigation array changes extra issues on an already-invalid collection. The collection error still prevents planning. |
| 176, 464, 478 | `validId`, `Number.isFinite`, and `Number.isInteger` already reject the non-string or non-number types checked by these redundant clauses. |
| 204, 222, 307 | Removing a primitive-type guard changes which validation issues are returned; JSON scalar records remain invalid through required fields. The object-specific error wording is not pinned beyond the tested null case. Callable objects with attached schema fields are outside the JSON import boundary. |
| 234, 239, 241 | The individual unknown-source/wrong-destination errors and the combined unsupported-path error overlap. Each mutation leaves explicit errors for unsupported paths; it changes the diagnostic list. |
| 339 | The changed branch adds a buffer-quantity issue only for an already-rejected unknown mitigation kind. Valid capacity and buffer scenarios are unchanged. |
| 140, 141, 191, 209, 236, 244, 245, 252, 280 | Diagnostic label or duplicate error wording changes. Rejection and explanatory numeric/reference errors remain. Exact labels are not a calculation invariant. |
| 442 | Still needs a minimal missing-ID case proving the sole returned diagnostic is nonblank; do not classify an empty sole issue as acceptable. |
| 352 (timeout) | The mutant changes `day += 1` to `day -= 1`, so the simulation never completes. The timeout detects that nontermination. |

No mutation exclusions or scanner suppressions were introduced. The shared-supplier capacity defect is independently reproduced and remains a required source fix; mutation counts are not evidence that all valid networks obey capacity constraints.
