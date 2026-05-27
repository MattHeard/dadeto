Unexpected hurdle: the new `npm run check` orchestration needed to stay parallel and still produce deterministic failure reporting, which made a direct shell script awkward to test.

Diagnosis path: I split the work into a small runner module plus a CLI wrapper, then used fake child processes in Jest to prove both the aggregate and fail-fast flows without launching the full repo gate.

Chosen fix: `npm run check` now runs the sub-checks in parallel, writes structured JSONL failure events to stderr as they happen, and finishes with a summary; `npm run check:fast` stops on the first failure.

Next-time guidance: when changing quality gates again, keep the runtime logic in a testable module and keep the CLI thin so the behavior can be verified without depending on the whole suite being green.
