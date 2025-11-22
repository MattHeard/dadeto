Unexpectedly high lint noise in `src/core` meant the request for a post-fix warning count could not be satisfied by eyeballing the console, so I wrote the small Python snippet that walks `reports/lint/lint.txt`, toggles on a /src/core/ path block, and counts the warning lines. That same approach will save time next time the instructions ask for a directory-scoped summary instead of a total count.

Extracting the `getAuthorizationHeader` fallback into `resolveFirstNonNullValue` let me drop the conditional from the function itself, which satisfied the complexity rule without disabling it and kept the new helper simple enough to stay within the limit.

Open question: should we adopt a lint-summary helper (e.g., JSON output or a reusable script) to make directory-filtered warning counts easier for future agents?
