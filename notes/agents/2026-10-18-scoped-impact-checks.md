# Scoped impact check executor

- Unexpected hurdle: the first aggregate run caught a five-argument helper, missing child-process option typing, and a CLI file over the 50-line limit.
- Diagnosis: `npm run check` surfaced the `repo/no-parameter-bag-arity-smuggling`, TSDoc, and non-core-thin failures; `reports/lint/lint.txt` gave exact lint locations.
- Fix: pass the executable and argv as one command vector, type the spawn options with Node's string-encoding options, and keep the local CLI wrapper below its size limit.
- Next time: when related-test discovery falls back in a constrained environment, pass the test file directly for focused Jest validation; use `npm run check` to validate the whole changed worktree.
- Evidence: focused `test/scripts/plan-check-impact.test.js` passed 23/23; `npm run check` passed all 10 aggregate gates after the fixes.
