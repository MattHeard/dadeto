# Moderator reputation runtime arity cleanup

- Unexpected hurdle: the first full check exhausted the 2 GB `/tmp` tmpfs because repeated full runs had grown Jest's transform cache to the volume limit. The first affected shard reported ENOSPC; the source tests were not the cause.
- Diagnosis: disk inspection showed `/tmp/jest_rs` at 2 GB, while inode capacity and the main workspace disk had ample space.
- Fix: the runtime now reads its six service values from the named dependency record, preserving bare function invocation and operation order. For verification, I removed only the generated Jest cache and reran `npm run check` with `TMPDIR` set to ignored workspace-local `.tmp` storage.
- Evidence: focused runtime and cloud entrypoint tests passed (2 suites / 2 tests); targeted arity scan and TSDoc passed. The workspace-temp rerun passed all 10 check gates. Coverage: lines 23575/23575, statements 24724/24724, functions 7927/7927, branches 13274/13274 (100%). Local E2E passed 11/11, duplication found 0 clones, npm audit found 0 vulnerabilities. Cloud-only inventory fell to 8 findings in 8 files in `/tmp/parameter-bag-cloud-after-recalculate-reputation.json`.
- Next time: route long coverage runs to workspace-local temp storage when `/tmp/jest_rs` is near its 2 GB cap; next cloud candidates include `generate-stats-core.js` and `hide-variant-html-core.js`.
