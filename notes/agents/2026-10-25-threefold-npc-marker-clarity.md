# Threefold NPC marker clarity

- Unexpected hurdle: existing NPC silhouettes, outlines, and small role labels still did not make residents easy to tell apart from Mara in the phone-sized frame.
- Diagnosis: the `NPC` marker had a small bright fill with no inset; the mobile capture test also had stale selectors after the controls moved into the in-game interface.
- Fix: enlarge the resident marker, frame it in magenta around a dark inset with larger lettering, and point the manual at the distinct cyan `YOU` vs framed magenta `NPC` cues. Update the mobile test selectors and keep its narrow viewport screenshot.
- Evidence: renderer Jest passed 51/51; build passed; local Playwright mobile capture passed at 320×568 and is saved at `reports/threefold-mobile.png`; `DADETO_CHECK_PROGRESS_INTERVAL_MS=3000 npm run check` passed all 10 local gates across six test shards, with zero clones and zero audit vulnerabilities.
- Next time: inspect the actual handset-scale capture after any role-marker adjustment; test fixture selectors should follow the live accessible UI rather than obsolete headings or action wording.
