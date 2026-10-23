# THREEFOLD authored Tidal Archive valve scale

## Unexpected hurdles

- The new worktree initially lacked Jest; installing the declared dependencies resolved the missing executable.
- The first real-interaction regression exposed a second hardcoded −2 guard inside the two-chamber water operator, beyond the simulation's reach check.
- The first aggregate check found a nullable valve lookup that needed an explicit existence guard before passing its authored value to the operator.

## Diagnosis and fix

- Authored `interactionScale: -2` on the Tidal Archive service-valve scene data.
- Made simulation eligibility read the valve's authored scale and pass that same scale to the water-puzzle valve operator; the operator's default remains −2 for existing direct callers.
- Added a scene-independence assertion and an integration regression that changes the authored scale to −1, rejects the action at −2, and opens the valve at −1 while in reach.
- Preserved missing-valve no-op behavior, explicit simulation time, and water conservation.

## Evidence and next-time guidance

- Focused impact passed 2 suites / 17 tests.
- Changed-core evaluation passed 36 suites / 504 tests with clean ESLint and core parsing, zero clones, and no uncovered lines or branches in the three changed core modules.
- The first aggregate check found only the TSDoc nullability issue. After the explicit guard, `npm run tsdoc:check`, focused tests, and `DADETO_CHECK_BASE=origin/main DADETO_CHECK_PROGRESS_INTERVAL_MS=3000 npm run check` passed; build passed, manuals validated 79, and diff check passed. PR #2792 is open at `23006e16119eeddbdbad14d814a3159200b72645`; exact-head Terraform Validate 39881066431 passed and Full Check 39881066490 is running.
- When an authored action scale appears in a simulation gate, trace the entire action through the domain operator; a second scale check may otherwise keep behavior hardcoded.
