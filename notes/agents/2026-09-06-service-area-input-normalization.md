# Service-area input normalization

- Unexpected hurdle: the first full gate passed behaviorally but missed one finite-number branch in coverage.
- Diagnosis: coverage-final identified the untested non-finite numeric path in the shared normalizer.
- Fix: added an Infinity regression case and verified the full check passes with 100% service-area branch coverage.
- Next time: include finite-number edge cases alongside null and blank coercion cases when introducing numeric boundary normalization.
