# API-key credit v2 arity cleanup (2026-10-11)

- Unexpected hurdle: the sandboxed full check could not spawn child Node processes (`EPERM`) and could not resolve the npm audit registry (`EAI_AGAIN`).
- Diagnosis: the failures were execution/network restrictions, not repository failures. Re-running the same check with reviewed elevated execution completed all gates.
- Fix: removed transport-only destructuring from the Express adapter, credit-event response helper, and transaction helper. All use their named dependency/input records directly; the Firestore transaction write order and response mapping remain covered by existing behavior tests.
- Evidence: fresh per-file arity scan found 0; focused Jest passed 4 suites / 64 tests; scoped ESLint, syntax check, TSDoc, and diff check passed. Elevated `npm run check` passed all 10 gates with 100% lines/functions/statements/branches, 11 local browser checks, 0 clones, and 0 audit vulnerabilities (`.tmp/npm-check-parameter-bag-get-api-key-credit-v2-elevated.log`).
- Refreshed cloud scope: 17 findings across 17 `src/core/cloud` files (`.tmp/parameter-bag-cloud-after-get-api-key-credit-v2.json`). Next tie among one-finding files starts with `src/core/cloud/create-checkout-session/runtime-core.js`; select based on spec relevance and fresh source inspection. This is not a whole-repository count.
- Next-time guidance: if child Node launches or audit networking fail under the sandbox, preserve those logs and retry the same required evaluator using reviewed elevated execution before classifying the code change.
