# Atlas held-out accuracy report loop

- Unexpected hurdle: the first report implementation duplicated the comparator's structured validation error, and extracting it initially triggered the missing JSDoc lint rule.
- Diagnosis: jscpd identified an overlapping 7-line clone in the same module; focused coverage showed the report validation paths were covered, and ESLint reported the helper documentation requirement.
- Fix: share one `invalidAccuracyVariant` result builder, document its input and return type, and reuse the existing matched-compute comparator.
- Evidence: `npm run check:impact:run -- --files src/core/interpretability/algZooPilotHarness/index.js test/core/interpretability/algZooPilotHarness.test.js` passed: ESLint, core-parse, duplication (0 clones), 12 tests, and changed-core line/branch coverage.
- Boundary: fixtures are deterministic synthetic measurements only. They validate the preregistered 32-variant report shape and deliberately poor outcomes; they are not pilot results. No inference, pilot execution, or graph persistence occurred.
- Next step: persist a versioned evaluation report as linked evidence in the portable research graph in a separate Bead, still without running the pilot.
- Additional check finding: the full local gate surfaced TypeScript's uncertainty around `Map.get` and the comparator's discriminated union for per-scale slices. The aggregator's prior validation guarantees every accepted scale has eight finite, matched-compute variants; explicit input types and a local assertion encode that invariant without adding an unreachable fallback branch. The first focused rerun then requested Prettier layout, which was applied before the passing rerun.
- Final local gate: `npm run check` passed all 10 gates after the type and formatting fixes; the Markdown retrospective path caused the conservative all-unit fallback (976 suites / 6,829 tests across five serial shards, no failures, no coverage instrumentation).
