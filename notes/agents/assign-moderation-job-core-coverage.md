# Assign moderation job core coverage

- Unexpected hurdle: the remaining uncovered paths were defensive candidate-selection and tie-breaker fallbacks that normal integration fixtures do not reach.
- Diagnosis: the focused Babel coverage report identified the exact helper branches and nullish fallback.
- Fix: exposed the internal selection helpers through the existing test utility export and added direct branch tests, without changing production behavior or adding coverage exceptions.
- Next time: inspect focused uncovered-line output first; test pure helper fallbacks directly when integration setup cannot naturally construct them.
