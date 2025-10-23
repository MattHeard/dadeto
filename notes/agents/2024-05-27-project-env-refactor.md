## Generate Stats PROJECT refactor

- **Challenge:** Needed to separate environment-derived project id for easier testing without altering existing module behavior.
- **Resolution:** Introduced a helper that accepts an env object and derives the project id before wiring it into the generate stats core configuration.
