# Directory entry copy max-params cleanup

- **Challenge:** The recursive copy helpers still exceeded the `max-params` rule after earlier refactors because they threaded separate `src`, `dest`, `io`, and logger arguments.
- **Resolution:** Bundled the path pair and execution utilities into context objects so each helper stays within the parameter limit without changing the recursion flow.
