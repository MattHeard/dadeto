# Console beacon recursion and fifteen-token duplication gate

## Diagnosis and repair

`dadeto-2lt4` was caused by injecting the dynamic `document.logError` facade into a handler that then replaced `console.error`. The facade called the replacement recursively. Browser main now retains a bound original console sink in a WeakMap keyed by the console, including across repeated initialization. The facade still reaches the reporting wrapper; the wrapper reaches only the original sink.

The regression uses the actual main, document, and beacon modules rather than mocking the logger. It verifies the console receiver, argument preservation, one report per console call, and repeated initialization. A Playwright regression checks actual generated browser modules on phone and desktop, with the remote report endpoint intercepted to avoid sending synthetic errors to production.

## Duplication hardening

`dadeto-orc` owns the user-requested reduction of `.jscpd.json` minTokens from 16 to 15. This exposed 48 clones. Small behavior-preserving refactors reduced the report through 23 and 9 clones to zero, without new exclusions or changes to scanner mode. Shared feasibility adapters preserve toy entrypoint exports. Other changes simplify collection mapping, guards, serialized payload aliases, typed form results, and initialization/batch-write boundaries.

Moving callbacks out of context exposed implicit-any parameters. Explicit callback contracts preserve type checking; use the normalized configuration's declared return type rather than a broad record, which loses required fields.

## Checkpoint evidence

- Logger-focused Jest: 4 suites, 33 tests passed.
- First clone checkpoint: 14 suites, 231 tests passed.
- Second clone checkpoint: 23 suites, 280 tests passed.
- `npm run duplication`: zero clones at minTokens 15; `reports/duplication/jscpd-report.json`.
- `npm run tsdoc:check`: passed after preserving callback contracts.
- `npm run build`: passed; `/tmp/dadeto-build-15.log`.
- Local phone/desktop Playwright: `/tmp/dadeto-playwright-15.log`.

The first aggregate run passed every gate except the newly stricter duplication gate. Final aggregate acceptance is retained separately in the owning beads and this note once it completes. Source checkpoints were pushed frequently as requested.

## Next-time guidance

Do not mock away a console facade when testing console replacement. Keep native sinks bound before replacement and test reinitialization. At low strict-mode token thresholds, inspect exact reported pairs and refactor their helper boundaries without suppressing source paths. Run focused tests and the type gate before the expensive full coverage rerun.
