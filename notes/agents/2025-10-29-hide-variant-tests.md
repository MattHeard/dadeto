## Notes

- Expanded the hide-variant-html unit suite to drive branch coverage to 100%, which required targeted runs to discover the remaining uncovered nullish coalescing path.
- Confirmed the coverage gains with focused Jest invocations before re-running the full suite to satisfy the workflow guardrails.
- Knocked out one of the lint `no-ternary` warnings while leaving a count of remaining core warnings for follow-up work.
