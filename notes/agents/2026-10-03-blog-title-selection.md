# Blog-key title selection

The report paired parseTitle's fallback tail with checkout string handling. The
helper now uses typed canonical whenOrDefault selection. A successful check must
still read title again: changing getters may return an untyped/falsy second value,
and the original helper returned that unchanged. Rejected object values are not
coerced or read twice. Do not cache the first getter or add extra validation.

Evidence `.tmp/blog-title-selection-tests.log`: 26 tests/two suites, exact 100%
owner coverage, including selected whitespace/undefined/number/false and rejected
coercion. `.tmp/blog-title-selection-static.log`: duplication only, 52 to 51 strict
clones. `.tmp/blog-title-selection-build.log` passes. Frozen full acceptance:
`.tmp/clone-goal-51-full-check.log`. Threshold, exemptions and ignores unchanged;
aaou remains open until zero clones and completely green terminal check.
