# Assignment rejection serialization

Named public `formatCommitFailure` and `formatAssignmentFailure` functions now delegate to a shared compact serializer in safe assignment persistence. Callers retain their leading flags and property order. Reasons remain uncoerced; undefined is omitted by JSON serialization and nonserializable reasons still throw. No normalization or persistence behavior changed.

Added a direct public-formatter regression covering strings, null, undefined, zero, structured reasons, compact property order, and BigInt TypeErrors. It complements the existing boundary tests, which normalize thrown errors before selecting a formatter.

Evidence: `.tmp/shared-assignment-rejections-final-tests.log`, 1,228 tests / 134 suites pass with exact 100% coverage in all four metrics for persistence and strict assignment core. `.tmp/shared-assignment-rejections-final-static.log`, nine gates pass; duplication alone fails at 104 clones, down from 105. No ignores, exclusions or threshold changes. Parent goal remains active; fresh aggregate verification follows the pushed checkpoint.
