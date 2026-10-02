# Reference assignment list configurations

Three legacy reference-list entries now obtain their configured parser and
append operation from `referenceAssignmentLists.js`. Original module paths
re-export both `parseRequest` and the public toy name. The asset-only list keeps
its factory-default memory policy; person and custodian variants explicitly use
`referenceMemoryLocation`, with unchanged required keys and error strings.

All 134 toy suites / 1,218 tests pass, including direct parser compatibility and
memory-policy regressions. The new configuration module has exact 100%
statements/branches/functions/lines coverage (`.tmp/reference-list-tests.log`,
`.tmp/reference-list-coverage`). Static aggregate passes nine gates; duplication
alone fails at 125 clones, reduced from 126 (`.tmp/reference-list-static.log`).
No gate settings, exceptions, exemptions or ignore pragmas changed.
