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
