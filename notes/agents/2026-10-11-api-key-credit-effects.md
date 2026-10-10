# API key credit effects boundary

- Unexpected hurdle: the first full check hit a stale `/tmp/jest_rs` cache exhaustion, then exposed an overlong simulator adapter module and two uncovered required-adapter guards.
- Diagnosis: use the saved check log and coverage report to separate environment failures from source issues; coverage pointed directly to the two guard branches in the simulator.
- Chosen fix: keep effect implementations inside the existing thin local simulator/server wrappers, add focused rejection coverage for missing transaction and document adapters, and put Jest temporary files under `.tmp` for the full check.
- Next-time guidance: run `npm run check` with repo-local temporary storage in constrained environments; inspect the branch map for exact uncovered guards before changing coverage policy.
- Evidence: `TMPDIR=/home/matt/dadeto/.tmp/check-tmp npm run check` passed; captured at `.tmp/npm-check-api-key-credit-effects-verified.log`.
