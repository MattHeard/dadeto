# 2026-05-30 non-core wrapper policy

- Unexpected hurdle: applying the new wrapper-shape rule to every `src/cloud/**` file produced noise from support modules that are not deployable entrypoints.
- Diagnosis path: ran the focused non-core-thin tests, then the full non-core-thin gate, and compared the violation count before and after narrowing cloud enforcement.
- Chosen fix: added a separate wrapper-violation bucket for `src/cloud/**/index.js`, `src/browser/**`, `src/build/**`, `src/local/**`, and `src/scripts/**`; the gate accepts wrappers that declare `handle` from a factory and either export or invoke it.
- Next-time guidance: keep non-core policy checks scoped to executable adapter surfaces first, then widen only after the target directory has a consistent wrapper convention.

## First invoked script wrapper

- Unexpected hurdle: the first script conversion still needed command behavior coverage because moving side effects into core would otherwise hide the exit-code path.
- Diagnosis path: converted `src/scripts/check-non-core-thin-files.js`, reran the focused status tests, and confirmed `npm run non-core-thin` dropped from 112 to 111 wrapper violations.
- Chosen fix: added `createCheckNonCoreThinHandle` in the core non-core-thin module, injected `console` and `process.exitCode` from the script, and left the script as a `const handle = ...; handle();` adapter.
- Next-time guidance: for script wrappers, move the command side effects behind an injected core handle first; then keep the executable file as the thinnest possible invocation shell.

## Build entrypoint pattern script wrapper

- Unexpected hurdle: the existing build entrypoint checker mixed validation, filesystem reads, and CLI reporting in one script, so a direct wrapper rename would not really make the non-core surface thinner.
- Diagnosis path: extracted pure validation into `src/core/build/entrypoint-pattern.js`, added focused branch tests, and confirmed `npm run non-core-thin` dropped from 111 to 110 wrapper violations.
- Chosen fix: moved pattern rules and command handling into core, then left `src/scripts/check-build-entrypoint-pattern.js` as injected file-read/output wiring plus `handle()`.
- Next-time guidance: script checks that already have small custom rule engines are good wrapper-policy candidates, but keep `fs`/`path` in the script and inject reads into core so core stays environment-agnostic.

## Aggregate check script wrapper

- Unexpected hurdle: `src/scripts/check-runner.js` was only a re-export shim, so making it match the wrapper pattern would preserve an unnecessary non-core file.
- Diagnosis path: inspected all imports and found only `src/scripts/run-check.js` and the Jest suite used the shim; both could import `src/core/check-runner.js` directly.
- Chosen fix: added `createRunCheckHandle` to core, converted `src/scripts/run-check.js` to an invoked handle, deleted the shim, and updated tests to import the core runner directly.
- Next-time guidance: when a non-core violation is only a re-export bridge, prefer deleting it and updating imports over manufacturing a wrapper around a wrapper.

## Duplication gate wrapper

- Unexpected hurdle: `src/scripts/check-duplication.js` still bundled launch wiring, report parsing, and clone-summary formatting, and the first extraction tripped lint complexity warnings.
- Diagnosis path: split the gate into small core helpers, reran focused lint/Jest, and confirmed the wrapper count moved from 107 to 106 once the script became a thin invoked-handle adapter.
- Chosen fix: added `createCheckDuplicationHandle` in `src/core/scripts/check-duplication.js`, injected `jscpd`, filesystem, and output dependencies from the script, and kept the non-core file as a direct `handle()` launcher.
- Next-time guidance: when a gate needs both launch wiring and result interpretation, split the interpretation helpers first so the outer factory stays trivially thin and lint-friendly.

## Core scripts builtin policy

- Unexpected hurdle: tightening the core-scripts dependency rule exposed a coverage regression instead of a dependency violation, because the default stderr fallback in `src/core/scripts/check-duplication.js` was not exercised.
- Diagnosis path: added a `dependency-cruiser` rule for `src/core/scripts/**` against Node built-ins, then used the focused duplication test coverage output to trace the remaining 94.44% function coverage back to the default no-op writer.
- Chosen fix: keep Node built-ins in the outer script wrapper, inject `fs`/`path`/`url`/`child_process` into core, and add an error-path test that leaves the default writers in place so the fallback branch is covered.
- Next-time guidance: when moving policy enforcement into `depcruise`, always pair it with a focused coverage check on the target file so a missing default branch does not hide behind a seemingly successful refactor.

## Browser admin wrapper

- Unexpected hurdle: `src/browser/admin.js` was a single-shot bootstrap file, but it still counted as a wrapper-shape violation because it invoked `initAdminApp` directly instead of going through a handle factory.
- Diagnosis path: confirmed `src/core/browser/admin-core.js` already owned the bootstrap logic, then added a tiny `createInitAdminAppHandle` factory and a focused coverage test to exercise the wrapper entrypoint.
- Chosen fix: let the browser module build `const handle = createInitAdminAppHandle(...); handle();` and keep the actual admin bootstrap wiring in core.
- Next-time guidance: for tiny browser entrypoints, prefer a handle factory in core plus a one-line invoker in the browser file so the wrapper rule can be satisfied without moving unrelated logic.

## Browser static config wrapper

- Unexpected hurdle: `src/browser/loadStaticConfig.js` needed to keep exporting `loadStaticConfig` for callers while the non-core rule only recognizes the literal `handle` wrapper shape.
- Diagnosis path: checked the wrapper validator and confirmed it accepts an exported `handle`; then verified callers only need the existing named `loadStaticConfig` export.
- Chosen fix: create `const handle = createLoadStaticConfig(...)`, export `handle`, and keep `export const loadStaticConfig = handle` as the public compatibility name.
- Next-time guidance: for value-export wrappers, use `handle` as the validator-facing name and alias it back to the domain-specific export rather than renaming downstream callers.
