# Neon Covenant short campaigns

- Unexpected hurdle: the first embedded Playwright scenario test had no persisted state to inspect, while standalone mode initialized and saved automatically.
- Diagnosis path: the embedded presenter only advances/saves after a submitted input; comparing its `permanentData` before any submission returned `null`.
- Chosen fix: submit the initial X action through the embedded toy before reading its slot, then exercise the same scenario selector/confirmation flow as standalone. Phone and desktop standalone/embedded all pass.
- Next-time guidance: embedded toy e2e tests should initialize through the real input envelope and use the selected-slot save adapter, not assume page load writes a snapshot.
- Evidence: `npx playwright test --config mosslight.playwright.config.ts mosslight-e2e/neon-covenant.spec.ts --grep 'scenario launch discloses' --workers=1` passed 4/4 (phone and desktop, standalone and embedded). Final `npm run check` passed all 10 gates, including build and 9/9 repository browser tests; global coverage was lines 21723/21723, statements 22714/22714, functions 7412/7412, branches 11567/11567, skipped 0; strict jscpd reported 0 clones. The three authored scenario routes and save/controller invariants pass in `test/core/browser/game/neonScenarios.test.js`.
