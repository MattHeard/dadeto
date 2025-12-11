# jscpd min token hunt

- After running the duplication check with the existing `minTokens: 26`, there were zero clones reported, so nothing stood out until I explicitly reduced the threshold. Dropping to 25 quickly produced the first duplication, so the surprise was how much the detection surface shifts with a single-token change.
- To diagnose, I updated `.jscpd.json`, reran `npx jscpd --config .jscpd.json`, and inspected `reports/duplication/jscpd-report.json` for the first clone entry (submit-moderation-rating vs. submit-new-story). That confirmed the only way to witness duplication was lowering the threshold, rather than looking for missing files or other misconfigurations.
- Learned: when we want the duplicate report to fire, treat the `minTokens` value like a tuning knob—think about scripting a binary search next time instead of stepping by 1. Also, capture the clone details (paths + line ranges) in the note so future agents know what to look for before they assume no duplication exists.

Open questions / follow-ups:
- Are these clones (25-token fragments in the cloud folder) considered worth action, or should we keep the threshold high to avoid noise? Maybe ask the team before we adjust quality gates again.
