# jscpd min token tuning

- Today I was asked to iteratively reduce the `.jscpd.json` `minTokens` setting until duplication appeared. Starting from 25, I stepped down to 24, reran `npx jscpd --config .jscpd.json`, and the report finally surfaced clones (submit-new-page vs. submit-new-story and get-moderation-variant vs. mark-variant-dirty). That confirmed 24 is the first threshold that trips the duplication detector.
- The cloned fragments now live under `reports/duplication/` as usual, so any future agent can inspect those files if they want to understand the detected overlaps before deciding whether to refactor further or raise the bar.

Open questions / follow-ups:
- Should we keep `minTokens` at 24 going forward? The duplicates touch different parts of `src/core/cloud`, so the team may want to triage those clones before locking in the threshold.
