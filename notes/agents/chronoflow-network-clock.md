# Chronoflow trusted Internet clock

- Unexpected hurdle: the first aggregate check found inaccurate JSDoc response-chain types; a midpoint-offset review also found the estimator was advancing from response completion without accounting for half the request interval.
- Diagnosis: follow the failing `tsdoc:check` locations, then derive the clock estimate against a request midpoint and a monotonic start/end bracket.
- Fix: added an uncached public Cloud Function time endpoint with CORS/preflight support, Terraform deployment and URL output, plus a pure browser adapter that derives offset/uncertainty, rejects malformed or slow samples, advances only from server time and monotonic elapsed time, and expires to stale.
- Next-time guidance: before enabling tides, wire the Terraform URL through deployment configuration or a same-origin route, show synchronization/stale/offline state in the page, and ensure stale sync never earns timed completion. Browser code must continue to avoid `Date.now()` and `new Date()`.
- Evidence: focused trusted-clock Jest suites passed (10 tests, 100% module coverage); `npm run build:cloud` packaged the endpoint; `npm run manuals:check` validated 77 manuals; `npm run check` passed 10/10 with 100% lines/statements/functions/branches; `npm run duplication` reported 0 clones; `git diff --check` clean.
