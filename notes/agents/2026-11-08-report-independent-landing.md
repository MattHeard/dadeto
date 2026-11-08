# Independent typed report landing

Owner `dadeto-6jvu`; the separate impact task remains `dadeto-0nth` / PR #2819.
The combined preparation branch passed all report-specific checks, but also held
unfinished impact-runner changes. Land the independently valid report slice first,
as required by the spec's incremental workflow; retain every impact requirement.

This branch starts at current main, including approved generator and classifier
landings. It applies the complete report, pure Git parser, typed JSON parser and
policy refinement without changing `src/core/local/checkImpactPlan.js` or its
test. The unfinished combined impact harness/note remain on #2819. After this
landing, integrate main there to expose only the remaining impact diff.

Required full mutation scopes remain explicit and independently reproducible:

- `docs/quality/typed-report.stryker.config.mjs`: both complete report modules.
- `docs/quality/git-changes.stryker.config.mjs`: the complete pure Git parser.
- `docs/quality/logic-parse-roots.stryker.config.mjs`: complete changed policy/helper.

The source modules are byte-identical to the prepared branch's accepted 373,
52 and 262 killed-mutant reports. Verify that identity and fresh initial tests
on this branch, and run the complete Git-parser harness rather than relying on
an ephemeral command. Fresh local aggregate and authoritative CI are still required
for the exact combined generator/report tree. Passing this slice never closes the
unfinished impact mutation work or the overall architecture goal.

Fresh acceptance on this branch: the twelve focused report/Git/policy/compiler/
CLI/oracle suites pass 1,718 tests with all four metrics at 100% on all five
target logic files. `npm run check` passes all eleven gates. Site/cloud builds
and `npm run verify:cloud-packages` pass (27 packages, 713 reachable modules,
1,234 imports). Fresh complete Git-parser and policy runs kill 52 and 262
mutants respectively; their embedded sources match this branch. Record the
complete report mutation and exact PR/main Full Check outcomes in `dadeto-6jvu`
before closure; running checks do not establish acceptance.
