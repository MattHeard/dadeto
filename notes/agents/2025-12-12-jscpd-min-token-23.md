# jscpd min token 23

- With `minTokens` down to 23 the duplication detector finally returned hits, so this is the first threshold that surfaces duplicate fragments. The report now lists many clones (new-page vs. new-story token parsing, repeated `ok` responses in browser/cloud helpers, etc.), so any additional tuning or refactors should target those specific overlaps.
- The detection run refreshed `reports/duplication/html/index.html` and `reports/duplication/jscpd-report.json`, and the new JSON includes the fragments at the paths mentioned in the latest output. Keep the HTML/JSON in sync with the config so future agents can see the exact lines when deciding what to extract.

Open questions / follow-ups:
- Do we want to keep pursuing refactors for the clones listed at 23 tokens, or raise `minTokens` again after resolving the most actionable ones?
