# Assignment request builders

Reference-list parsers repeated JSON/record guards, required-ID coercion and path
validation. assignmentRequests.js now owns that shared parsing boundary. Caller
messages remain explicit; asset lists keep raw memoryLocation, whereas person
and custodian lists use the existing validated/defaulted location policy.

Person/asset predicates also repeated proposed-reference validation and filtering
of invalid existing assignments. buildAssignmentPredicateRequest now performs
that construction with the caller's own normalizer. Top-level parser guards and
their distinct error strings remain in the public modules; exported parsers and
normalizers are preserved. No suppression or exemption was added.

Evidence: .tmp/reference-request-tests-final.log (144 tests15 suites and exact100
in six changed source modules), .tmp/reference-request-check-static-verified.log
and reports/duplication/jscpd-report.json. First parsing extraction176 to173
clones; shared predicate construction brings the final count to172. The initial
return JSDoc used typeof request outside its scope; explicit collection types
repair that error rather than suppressing it. Goal remains unfinished.
