# Chronoflow time Allow Effects audit

- Unexpected hurdle: The first aggregate check ran inside the restricted sandbox and failed when child Node processes were denied with `EPERM`; focused tests passed.
- Diagnosis: The endpoint's public `createEffectHttpBoundary` mints a new capability for each request. `handleChronoflowTime` receives it as its first parameter and forwards it to every response mutation through the cloud-owned adapter. The core only reads the request method and invokes the injected server epoch clock; it does not mint or retain a capability.
- Chosen fix: No source change was needed. Ran the focused HTTP, adapter, and core tests, then reran `npm run check` with elevated execution; all 10 gates passed, including 11/11 local E2E and 0 clones.
- Next-time guidance: Continue by current `find src/cloud -name index.js | sort` order. The earlier `src/cloud/billing/index.js` entrypoint was missed in prior notes and should be audited before `chronoflow-time` is considered part of a complete ordered pass.
