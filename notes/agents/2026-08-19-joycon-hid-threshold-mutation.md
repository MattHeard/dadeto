# JoyCon HID threshold mutation coverage

- Hypothesis: a repeated HID snapshot promotes at count 2, while count 1 remains pending and later repetitions remain promoted.
- Evidence: initial stabilization transition (`353–363`) killed 3/3 mutants; threshold branch (`366–372`) killed 6/6 with 0 survivors and 0 timeouts.
- Focused Jest (85/85), targeted ESLint, and diff checks passed.
