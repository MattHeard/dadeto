# HTTP method guard mutation scan

- Unexpected hurdle: the non-string policy branch was only tested in its enabled state.
- Diagnosis: the focused scan left the false-policy conditional alive.
- Fix: added an explicit `treatNonStringAsPost: false` assertion; the final scan killed 38 mutants and left only two documented static response-template mutants.
- Next time: test both enabled and disabled policy values for guard configuration branches.
