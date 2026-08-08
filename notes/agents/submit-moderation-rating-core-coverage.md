# Submit moderation rating core coverage

- Unexpected hurdle: statement and line coverage reached 100% while branch coverage remained at 97.72%.
- Diagnosis: the remaining branches handled a null decoded token after verification; a primitive rejection covered the error-message fallback but not the nullish-coalescing path.
- Fix: added focused responder tests for primitive verification failures and null decoded tokens.
- Next-time guidance: when a coverage report points to a nullish-coalescing line, exercise both the nullish and non-nullish values even if downstream validation already has broad tests.
