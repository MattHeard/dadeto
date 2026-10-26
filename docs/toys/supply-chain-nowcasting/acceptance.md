# Supply-chain Nowcasting Acceptance

Define explicit, machine-checkable acceptance criteria and where evidence is stored.

## Machine-Checkable Criteria
- [ ] `npx jest --runInBand --runTestsByPath test/core/browser/game/supplyChainNowcasting.test.js` exits with status 0 and proves the hand-computed sample.
- [ ] `npm run check` exits with status 0 after each implementation loop.
- [ ] `npm run build` exits with status 0 when the standalone page is integrated.
- [ ] `npx stryker run docs/toys/supply-chain-nowcasting/stryker.config.mjs` leaves no unexplained surviving behavioral mutants.
- [ ] Browser acceptance shows a sample network and one-click disruption with a useful plan in under two minutes, no signup, clear hypothetical warning labels, and no autonomous action.
- [ ] Export contains baseline, warning signal, ranked alternatives, ranking criterion, and all constraints/assumptions; optional IDs round-trip.

## Evidence Collection
- Command log path: `artifacts/toys/supply-chain-nowcasting/commands.log`
- Generated artifacts:
  - Jest and Stryker reports under configured report paths.
- Test report path (if applicable): `reports/mutation/supply-chain-nowcasting.json`

## Pass/Fail Rules
- Pass each loop only when its named command succeeds and evidence is recorded on the owning Bead. Full toy acceptance also requires all browser criteria and mutation review above.
- Fail when model output is nondeterministic, violates capacity/lead time, hides invalid data, labels a hypothetical warning as a real forecast, or initiates execution.
