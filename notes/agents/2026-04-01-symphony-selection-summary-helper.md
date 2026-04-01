## Symphony selection summary helper

- **Context:** `jscpd` kept flagging the repeated selection-summary object shapes in `src/core/local/symphony.js` at the 17-token frontier.
- **Fix:** Extracted `buildSelectionSummary(summary)` so the blocked and idle selection summaries reuse the same object construction instead of repeating the `queueEvidence: []` shape inline.
- **Status:** This clears one clone group, but `symphony` still has several separate 17-token matches that will need a broader follow-up pass.

**Testing**
1. `npm run duplication`
2. `npm run lint`
3. `npm test`
