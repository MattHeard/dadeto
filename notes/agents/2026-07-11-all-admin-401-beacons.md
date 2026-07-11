# Beacon all admin Cloud Function 401 responses

- Unexpected hurdle: the full coverage gate first exposed an uncovered branch after the broader reporter wiring.
- Diagnosis: render and stats treated non-OK responses as normal return values, while only thrown fetch failures reached reportError.
- Fix: report non-OK render and stats responses, and keep regeneration reporting already in place.
- Verification: focused admin-core tests pass (108 tests) and TSDoc passes; full gate should be rerun after this coverage addition.
