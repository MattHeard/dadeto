# Coverage adjustments for bridge modules

- Reverted the prior workaround that imported proxy modules just to tick coverage counters because it skewed module loading.
- Taught Jest to skip coverage instrumentation for the cloud/toy re-export shims by adding regex-based `coveragePathIgnorePatterns`, keeping the ignore list pattern-driven instead of enumerating every file.
- Verified the new configuration still yields 100% branch coverage for `src/core` via `npm test -- --coverage` before wrapping up.
