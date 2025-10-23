# Authed fetch lint fix

- **Challenge:** ESLint forbids ternary operators in core modules, so the existing ternary in `createAuthedFetch` triggered a warning during the required lint run.
- **Solution:** Replaced the ternary with an explicit conditional block that builds the resolved headers map without altering runtime behavior.
