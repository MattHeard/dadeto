# Neon scenario menu parity

- Unexpected hurdle: the clinic-launch scenario was the only authored scenario covered through the actual controller menu; the autonomy pilot and brownout recovery had rules coverage but not presenter-level start coverage.
- Diagnosis: inspected `test/mosslight-e2e/neon-covenant.spec.ts` and compared its menu journey with the scenario setup definitions and current controller state.
- Fix: added phone/desktop and embedded/standalone journeys for both scenarios. Each confirms the destructive slot-replacement choice, then asserts the saved scenario objective, initial state, save validity, and absence of page errors.
- Evidence: focused Playwright run passed 8/8. `TMPDIR=/home/matt/dadeto/.tmp/neon-runtime DADETO_COVERAGE_SHARD_SIZE=40 npm run check` passed all 10 gates; unit coverage remained exact 100% across lines, statements, functions, and branches, and duplication reported zero clones. `npx prettier --check test/mosslight-e2e/neon-covenant.spec.ts` and `git diff --check` passed.
- Next-time guidance: scenario acceptance should exercise authored starts through the same eight-button menus in both presenters and verify save-backed starting state; isolated rule tests alone do not prove users can discover or safely launch a scenario.
