# Common core coverage

- Unexpected hurdle: the existing suite covered the public normalization helpers but left the aggregate check runner’s child-process lifecycle mostly unexecuted.
- Diagnosis: strict focused coverage began at 46.79% statements, 44.44% branches, 69.1% functions, and 45.9% lines.
- Fix: added tests for missing-file/path and reporting helpers, mapped tasks, check command handling, successful and failing child processes, fail-fast aborts, timeouts, stream forwarding, and defensive lifecycle branches. Added a small named test utility export for otherwise unreachable lifecycle branches.
- Evidence: focused Jest run with `commonCore.test.js` and `commonCore.coverage.additional.test.js` reports 44 tests passed and 100% statements/branches/functions/lines for `src/core/commonCore.js`.
- Next time: cover orchestration code with injected child doubles and explicit event sequencing; this reaches branches that normal subprocess execution cannot deterministically exercise.
