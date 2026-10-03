# Poll event-array ownership

The strict report matched the poller's local array fallback with a renderer tail.
The local reader is removed; appendEvent uses canonical arrayOrEmpty before its
existing append and bounded slice. Invalid inputs still produce a fresh history;
arrays keep their event objects, but appending must not mutate the prior array.

The existing null-PID launch test now covers undefined, null, text, array-like
objects, empty arrays and populated arrays. It asserts retained event identity,
unchanged input history and a new output history.

Evidence: `.tmp/event-array-tests.log`, 30 passing tests and exact 100% poll
coverage. `.tmp/event-array-static.log`: duplication is the only failure, 65 to
64 clones with unchanged strict minTokens14. `.tmp/event-array-build.log` passes.
Frozen-source full checkpoint: `.tmp/clone-goal-64-full-check.log`.
Terminal full check exited 1 with duplication as the only failure among ten
checks. Exact aggregate coverage: lines 20353/20353, statements 21203/21203,
functions 7055/7055, branches 10230/10230, from the coverage summary artifact.
dadeto-aaou remains open; zero clones and all-green check are still required.
