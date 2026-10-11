# API key credit response arity cleanup

- Unexpected hurdle: the response mapper accepted a destructured `{ status, body }` record in addition to three existing parameters, producing effective arity five.
- Diagnosis: the result is one cohesive value returned by the core credit handler; expanding its fields at the response boundary was unnecessary.
- Fix: pass the named result record intact and read `status` and `body` inside the mapper. The 405 Allow header and JSON-versus-text response selection are unchanged.
- Evidence: focused handler and branch suites passed (2 suites / 24 tests); targeted no-cache arity scan was warning-free; TSDoc passed; elevated `npm run check` passed all 10 gates. Coverage: lines 23559/23559, statements 24708/24708, functions 7927/7927, branches 13273/13273 (100%). Local E2E passed 11/11, duplication found 0 clones, npm audit found 0 vulnerabilities. Cloud-only inventory fell to 11 findings in 11 files in `/tmp/parameter-bag-cloud-after-api-key-credit.json`.
- Next time: use the refreshed cloud inventory; the largest remaining item is the 14-field `createGenerateStatsCore` finding.
