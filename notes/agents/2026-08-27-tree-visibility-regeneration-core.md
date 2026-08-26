# Mutation completion: tree-visibility regeneration core

- Unexpected hurdle: the initial scan left seven survivors around Firestore query literals, error logging arguments, optional reference paths, and the migration counter.
- Diagnosis: focused tests verified outcomes but not those exact operational contracts.
- Fix: added assertions for the dirty-variant query, error logger arguments including missing references, and migration write counts.
- Evidence: final focused mutation scan instrumented 31 mutants and killed all 31, with 0 survived and 0 timed out. ESM-aware focused Jest passed 5 tests.
