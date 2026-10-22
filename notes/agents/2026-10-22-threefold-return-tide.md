# THREEFOLD Return Tide implementation loop

- Unexpected hurdles: the local manual still described the finale as unimplemented, and the first rebased `npm run check` exposed a nested Jest clean-checkout test failure plus the known 384 MiB TSDoc heap limit.
- Diagnosis and fix: aligned the toy docs with the live Rank 1 specification; added explicit `--runTestsByPath` to the isolated cloud-package contract invocation and retained subprocess stderr on failures; raised the strict TSDoc heap to 512 MiB after it failed alone at 384 and passed at 512.
- Evidence: Return Tide focused coverage reports 100% statements, branches, functions and lines for all 15 changed core files (35 suites / 459 tests); `npm run check` passed all 10 gates using `origin/main` as its comparison base; `npm run build` and the 79 manual checks passed. See the local evaluator log `/home/matt/dadeto/.git/return-tide-check-final.log` and Bead `dadeto-8oi7`.
- Next: push this coherent playable slice and merge it as soon as its exact-head Full Check passes. Keep the Rank 1 spec Active/Partial; continue auditing the full causal scenario matrix and cross-region epilogues instead of treating this slice as the finished campaign.

## Survey-aware aftermath duties loop

- Unexpected hurdle: the first aggregate check found TypeScript errors for string-indexed obligation maps.
- Diagnosis and fix: the state keeps canonical identifier arrays as strings, so both authored maps received explicit string-keyed JSDoc record types. This preserves validation at the restore boundary and avoids weakening types or suppressing diagnostics.
- Evidence: `npm run check` passed all 10 gates and six test shards; 9,083 tests passed, lint/type/parse/duplication/manual gates passed, zero clones. `npm run check:impact:run -- --files src/core/browser/game/threefold/return-tide.js test/core/browser/game/threefold-return-tide-presentation.test.js test/core/browser/game/threefold-return-tide.test.js` passed 31 suites / 409 tests and reported no uncovered statements or branches for the modified core file (all four coverage metrics 100%). `npm run build` passed. The obligations remain observation-gated by their damage region; the Foldglass duty remains conditional on binding.
- Next: publish this as a separate short-lived PR from merged main, merge after exact-head CI, and continue the open Rank 1 causal matrix and cross-region survivor audit.

## Return Tide finale current-main verification

- Unexpected hurdle: the original local acceptance note still said aggregate validation was pending even though the finale source had since landed on main.
- Diagnosis and fix: reran the changed-core evaluator on the 15 finale modules and their related tests at current main, then checked every collected file's statement, branch, function, and line percentages directly.
- Evidence: 35 related suites / 489 tests passed; all 15 core files are 100% on all four metrics. The repository fast check passed all 10 gates, the build passed, and `manuals:check` validated 79 manuals. Exact-head Full Check for the concurrent warning PR #2780 is still running and is not claimed as passed here.
- Exact-head evidence: Full Check [39844768182](https://github.com/MattHeard/dadeto/actions/runs/39844768182) passed for PR #2780 at `d7ccd38bfd78005defb500e8aabbb8aecccf54ed`; PR #2780 merged to main as `9848048e5acfc7dd13df56626fc2d74e6dfc8e08`.
- Next: keep `dadeto-8oi7` open for the remaining causal matrix and cross-region epilogue acceptance, then take the next Rank 1 slice from the live Notion spec.
