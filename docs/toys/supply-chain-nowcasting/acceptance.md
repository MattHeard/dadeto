# Supply-chain Nowcasting Acceptance

Define explicit, machine-checkable acceptance criteria and where evidence is stored.

## Machine-Checkable Criteria
- [x] `node scripts/run-jest.js --runInBand --runTestsByPath test/core/browser/game/supplyChainNowcasting.test.js test/core/browser/game/supply-chain-nowcasting-page.test.js test/generator/decisionToolCatalogueLinks.test.js` exits with status 0 and proves the hand-computed sample and browser flow.
- [x] `npm run check` exits with status 0 after each implementation loop.
- [x] `npm run build` exits with status 0 when the standalone page is integrated.
- [x] Focused Stryker evidence and review are recorded. The whole-planner run at `4c12c09` produced 486 mutants: 461 killed, 24 survived, 1 timeout. The new shared-allocation and sole-ID-diagnostic ranges then produced 26 mutants, all killed. Remaining earlier behavioral and diagnostic mutants are classified below. Reports: `reports/mutation/supply-chain-nowcasting-before-allocation.json` and `reports/mutation/mutation.json`.
- [x] Response options show `minimumWarningLeadDays`, the minimum advance warning for arrival within the horizon (0 for current response; null when even day zero is too late). The table and exported plan preserve it and explain capacity/shortfall caveats.
- [ ] Show each option's remaining shortfall and explicitly warn when no feasible option covers demand, as required by scope 4 of the live spec.
- [ ] Verify and enforce that capacity mitigation arrival respects its route's fulfillment lead time as well as its own lead time.
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
- Acceptance audit reproduced and fixed shared-supplier over-allocation: baseline routes reserve capacity collectively, and mitigations consume only the aggregate remainder. The exact-allocation and above-limit cases pass; the owning Bead remains active for browser acceptance and the final spec audit.

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
| 442 | Killed by the new minimal scenario whose only issue is a missing supplier ID referenced consistently by its route. The test requires a nonblank sole explanation. The focused follow-up mutated this diagnostic at its new line 494. |
| 352 (timeout) | The mutant changes `day += 1` to `day -= 1`, so the simulation never completes. The timeout detects that nontermination. |

No mutation exclusions or scanner suppressions were introduced. The shared-supplier capacity defect was independently reproduced and fixed. A follow-up focused run covered lines 69–72 (supplier headroom), 305–329 (allocation calculation and rejection), and 494–495 (sole missing-ID issue): 26/26 mutants killed, no survivors or timeouts. This bounded run complements the earlier whole-planner report; it is not a new whole-planner mutation count.

## Shared supplier allocation evidence

- Scoped impact passed 2 suites / 113 tests, full planner line/branch coverage, ESLint, core parse, and zero clones.
- `npm run build` passed with the fixed planner copied to the standalone page.
- Source tests prove that exact total allocation is allowed, exceeding a shared supplier allocation is explicitly rejected, and mitigations at or above the remaining shared limit are distinguished correctly.
- `npm run check` passed all 10 gates for this source loop, including all six serial Jest shards, lint/static gates, manual validation, zero clones, and audit. Cloud browser execution and the explicit warning-time breakpoint remain open.

## Warning-time breakpoint evidence

- Scoped impact passed 2 suites / 116 tests with full line/branch coverage for the planner and presenter, ESLint, core parse, and zero clones. One preexisting table test initially read the old shortfall column index; it was corrected to the new layout and the evaluator rerun successfully.
- Focused Stryker on the new timing helper and labels killed all 23 mutants (8 planner, 15 presenter), with no survivors or timeouts. The earlier 26/26 allocation report is preserved as `reports/mutation/supply-chain-nowcasting-allocation.json`.
- `npm run check` passed all 10 gates and `npm run build` passed. The cloud case now checks the two-day threshold immediately below and at feasibility.
- Full Check `40359925519` for supplier-fix commit `45ef278` succeeded. Cloud run `40358398354` executed the earlier supply-chain journey successfully in 903 ms; all 14 Playwright cases passed in 48.3 s. The job then failed when `gcloud storage cp` tried to read/list destination objects using its write-only `roles/storage.objectCreator` identity. Report upload failed, so no screenshot or interaction record was retained; browser artifact acceptance remains open. Logs are under `/tmp/dadeto-gcp-40358398354` and the workflow's `playwright-job-logs-t-ff1e26db` artifact.

## Shared artifact uploader repair

The report uploader now uses explicit create-only JSON API POSTs under the existing `roles/storage.objectCreator` binding, with unique-prefix and no-overwrite preconditions. Filesystem, credential, and HTTP dependencies require AllowEffects. Focused uploader/workflow checks passed 20 tests and complete new-core line/branch coverage; the aggregate `npm run check` passed all 10 gates, and the build passed. See `notes/agents/2026-10-26-playwright-write-only-upload.md`. Actual report retention is not yet verified; finish the remaining demand/route-timing criteria before dispatching the next current-code cloud run.
