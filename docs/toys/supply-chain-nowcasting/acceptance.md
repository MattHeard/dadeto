# Supply-chain Nowcasting Acceptance

Define explicit, machine-checkable acceptance criteria and where evidence is stored.

## Machine-Checkable Criteria
- [x] `node scripts/run-jest.js --runInBand --runTestsByPath test/core/browser/game/supplyChainNowcasting.test.js test/core/browser/game/supply-chain-nowcasting-page.test.js test/generator/decisionToolCatalogueLinks.test.js` exits with status 0 and proves the hand-computed sample and browser flow.
- [x] `npm run check` exits with status 0 after each implementation loop.
- [x] `npm run build` exits with status 0 when the standalone page is integrated.
- [ ] Focused Stryker run is recorded and every surviving or timed-out behavioral mutant is classified as killed by a new assertion, equivalent, or intentionally excluded with rationale. Latest run: 449 mutants; 389 killed, 59 survived, 1 timed out. Report: `reports/mutation/mutation.json`; the timeout is an assignment mutation in the daily simulation loop, and survivors still need review.
- [ ] Browser acceptance shows a sample network and one-click disruption with a useful plan in under two minutes, no signup, clear hypothetical warning labels, and no autonomous action.
- [x] Export contains baseline, warning signal, ranked alternatives, ranking criterion, and all constraints/assumptions; optional JSON and CSV IDs round-trip without affecting calculations.

## Evidence Collection
- Command log path: `artifacts/toys/supply-chain-nowcasting/commands.log`
- Generated artifacts:
  - Jest and Stryker reports under configured report paths.
- Latest full local check after optional industry IDs: `npm run check` passed all 10 gates; all six serial Jest shards passed, lint and static gates passed, duplication reported 0 clones, and manuals validated successfully.
- Test report path (if applicable): `reports/mutation/supply-chain-nowcasting.json`

## Pass/Fail Rules
- Pass each loop only when its named command succeeds and evidence is recorded on the owning Bead. Full toy acceptance also requires all browser criteria and mutation review above.
- Fail when model output is nondeterministic, violates capacity/lead time, hides invalid data, labels a hypothetical warning as a real forecast, or initiates execution.
