# Process new page incoming-option context

- Unexpected hurdle: option-context resolution accepted Firestore access, the incoming path and snapshot, write batch, random sources, and timestamp creation in one parameter bag; its nested context builder unpacked an even larger bag.
- Diagnosis: the flow has a read/validation phase followed by context construction. A staged builder can capture stable database/batch dependencies and event runtime values while keeping the validated option refs as a cohesive value.
- Fix: `resolveIncomingOptionContext` now takes four explicit inputs and delegates validated refs to a context builder. The staged builder preserves null returns for invalid/missing refs and carries the same page, batch, random, UUID, and server timestamp behavior forward.
- Evidence: focused process-new-page Jest passed (2 suites, 37 tests); fresh no-cache scan dropped from 11 to 9 findings; `npm run check` passed all 10 gates; `npm run build:cloud` passed. Logs and scan report are in `.tmp/`.
- Next-time guidance: continue with `resolveIncomingOptionPageContext`, separating existing-page lookup from creation while preserving existing-context precedence.
