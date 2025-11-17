## Authorization getter assumption

- **Surprise**: once I assumed Express `req.get('Authorization')` always surfaces the header, the existing tests that asserted fallbacks via `req.headers` started failing. That brought attention to how much of the coverage file was devoted to those now-deprecated paths.
- **Actions**: I extended `getAuthorizationHeaderFromGetter` to check both casing variants, removed the manual headers/fallback logic, and deleted the tests that validated the redundant behavior. After the cleanup I reran `npm test` to ensure nothing else depended on the old assumptions.
- **Lesson**: keep population-level test coverage aligned with the actual request contract; when the contract changes, rather than hacking old cases back in, consider dropping those scenarios so the suite still reflects the desired behavior.
- **Follow-up**: double-check that any upstream or integration code (Firebase entry points, mocks) actually provides a boolean `req.get` so this assumption remains defensible.
