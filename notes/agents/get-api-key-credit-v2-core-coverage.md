# API key credit V2 core coverage

- Hurdle: existing tests covered Firestore helpers and some handler routes but left event validation and dependency fallback branches unexecuted.
- Diagnosis: the missing paths were deterministic request contracts and error handling, testable with injected async functions and fake Firestore.
- Fix: add cases for invalid event bodies, UUID extraction/defaults, missing dependencies, numeric/null balances, missing UUIDs, and the default logger.
- Guidance: cover both GET balance and POST ledger lifecycles, including every validation failure before testing persistence errors.
