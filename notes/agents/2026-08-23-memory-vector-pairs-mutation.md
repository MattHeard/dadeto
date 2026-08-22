# Memory vector pairs mutation follow-up

- Unexpected hurdle: Stryker's progress output reported zero survivors while the JSON report contained one surviving conditional mutant.
- Diagnosis path: inspected `reports/mutation/mutation.json`; the survivor replaced the `value !== null` guard in `isObjectLike`.
- Chosen fix: added a direct `null` projection assertion through the module's test-only helper, then reran the authoritative per-file scan.
- Evidence: 37 killed, 1 static-ignored, 0 non-static survivors, 0 timeouts; focused Jest suite passed 18 tests.
- Next-time guidance: treat the final JSON report, not only progress output, as the authoritative survivor count.
