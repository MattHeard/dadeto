# jscpd min token 22

- Lowered `.jscpd.json` to `minTokens: 22` and reran `npm run duplication`; clones immediately appeared (e.g., `italics.js` vs `pre.js`, the `submit-moderation-rating`/`submit-new-story` pair, the duplicate stats helpers, and two spots inside `copy.js` itself), so the hunt can stop here.
- The reports in `reports/duplication` were refreshed with the new findings, so future agents see the first non-zero result at this threshold.
- Commands: `npm run duplication`.
