# complexity-profile.js coverage

- Unexpected hurdle: aggregate coverage showed a small branch gap in line-range normalization even though the primary analyzer tests passed.
- Diagnosis: tests supplied both range endpoints, leaving the nullish-default branches for omitted `start` and `end` untouched.
- Fix: added focused tests for each missing endpoint.
- Evidence: strict focused Jest passed at 100% statements, branches, functions, and lines.
