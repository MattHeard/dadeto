# Threefold mobile palette assertion — 2026-10-26

## Diagnosis

Exact-head Full Check 40314236643 reached 100% on all aggregate coverage metrics and passed all 1,052 Jest suites / 7,829 tests. Its only failure was the mobile Playwright canvas wait: the test still required cyan RGB `55,231,237`, even though Threefold now renders Mara in gold `#ffcb55` and residents in magenta `#f14bd3`.

## Fix and evidence

Updated the mobile canvas assertion to require the current gold player color while retaining the magenta resident color assertion.

- `npm run check` — passed all 10 gates, including 1,052 Jest suites / 7,829 tests across six serial shards.
- `npm run build` — passed.
- Playwright is not run locally under the repo E2E policy; the exact-head Full Check will validate the mobile canvas assertion.

## Next time

Use the exact-head Full Check result to confirm that the color wait now reflects the authored palette and the browser run succeeds.
