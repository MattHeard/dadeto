# get-moderation-variant effects

- Unexpected hurdle: the endpoint had no dedicated cloud integration suite, and moving command calls behind adapters made the entry module exceed the repository's 50-line non-core limit.
- Diagnosis: an initial boundary-only edit surfaced the thin-file failure; the composition and response decisions belong in a core runner, with concrete Firebase, Express, HTTP response, and logging calls kept in cloud adapters.
- Chosen fix: added a core runtime composer and permission-first cloud adapters. Startup init and route/middleware registration use synchronous startup boundaries; request responses and middleware failures receive invocation capabilities. The HTTP handler closes over the pure responder and resource objects, not a startup capability.
- Verification: focused cloud/core tests passed (3 suites, 39 tests); JSDoc, targeted ESLint, non-core thin-file check, build, and all non-test npm check gates passed. Aggregate npm test still fails because a Jest coverage worker exceeds its fixed 512 MB heap, including with one-file shards.
- Open finding: the core allowed-origin helper logs with console.debug. This endpoint reaches it during startup, and multiple other core callers do too; tracked separately in bead dadeto-ns37, which blocks closure of dadeto-5qwh.
- Next time: migrate allowed-origin diagnostic logging with a permission-first adapter across its call sites, then resume the lexicographic cloud audit.
