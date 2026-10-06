# Chronoflow first playable level

- Unexpected hurdle: the initial local Playwright case timed out because it selected a generic `#status` id that the Chronoflow page does not use; the first sandboxed run also could not bind the simulator port.
- Diagnosis: inspected the page shell for its explicit `#chronoflow-status` region, then reran the local E2E with network binding enabled.
- Fix: use the page's named status id; retain an accessible button-driven sluice, fixed-step simulation, visible untimed label, reset path, runtime/presenter unit tests, and full-page local browser acceptance.
- Next-time guidance: inspect actual authored IDs before writing browser selectors, and run network-binding E2E commands with the approved environment permissions. The Internet clock adapter, timed tide rules, editable routes, and embedded toy remain follow-up work.
- Evidence: `npx jest test/core/browser/game/chronoflow.test.js --runInBand` (11 tests passed); `npm run test:e2e:local` (10 tests passed); `npm run check` (10/10 evaluators, 100% lines/statements/functions/branches); `npm run duplication` (0 clones).
