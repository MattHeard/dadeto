# Mutation completion: check depcruise scope

- Unexpected hurdle: the initial scan left one survivor in the browser-global filter despite existing missing-identifier coverage.
- Diagnosis: `CORE_GLOBALS.includes(name)` already rejects non-string and undefined values, making the explicit `typeof name === 'string'` guard redundant.
- Fix: removed the dead type guard and preserved the existing parser/scope assertions.
- Evidence: final focused mutation scan instrumented 15 mutants, killed 11, ignored 4 static/no-coverage mutants, and had 0 survived and 0 timed out. ESM-aware focused Jest passed 32 tests.
