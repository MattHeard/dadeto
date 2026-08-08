# Check core parse coverage

- Unexpected hurdle: the focused suite requires subprocess permissions for classifier checks, and the last uncovered function was the no-op default stdout sink.
- Diagnosis: aggregate failure handling had no direct assertion, while the default output object is only invoked when a gate reports a violation without an injected writer.
- Fix: added aggregate-failure and default-output tests; ran the focused suite with subprocess permissions.
- Next-time guidance: when a coverage report names an anonymous function on a constant object, invoke the default dependency through the error/success path instead of replacing it with a mock.
