# Symphony status fallback policy

The strict report matched the fallback tails of string and object preservation.
Both now delegate branch ownership to canonical `when`, retaining their distinct
preferred-value predicates and resolvers. Do not replace this with null coalescing:
a preferred string getter can return a string during inspection and undefined on
the selected read, and that undefined must not trigger the fallback.

The integrated regression checks two string getter reads, three object getter
reads, fresh outer object identity and retained nested identity.

Evidence: `.tmp/status-policy-tests.log` passes 32 tests in two suites with exact
100% bootstrap coverage. `.tmp/status-policy-static.log` passes all gates except
duplication, reduced from 73 to 72 at unchanged minTokens 14. Browser packaging
passes in `.tmp/status-policy-build.log`. Goal and dadeto-aaou remain unfinished.
