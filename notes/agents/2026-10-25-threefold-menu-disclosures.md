# Threefold saved episode disclosure in Field Notes

- Unexpected hurdle: Full Check identified the saved-record rendering callback as uncovered even though the menu already displayed witness ledger and testimony entries.
- Diagnosis: `renderThreefoldFrame()` exposes optional episode disclosures as `{ title, text }`; Y > Field Notes maps these records through a separate callback.
- Fix: Added a realistic `iriWitnessLead` record to the in-game Field Notes regression and asserted its wrapped title and text.
- Evidence: Focused Jest coverage passed 1 suite / 12 tests; `/tmp/threefold-menu-records-coverage/coverage-final.json` shows the saved-record callback executed twice. `DADETO_CHECK_PROGRESS_INTERVAL_MS=3000 npm run check` passed all 10 gates, including six serial impact shards. `git diff --check` and Threefold spec cache refresh passed.
- Next: Continue closing the global Full Check coverage gaps without changing thresholds or exclusions. User reports NPC and player characters remain hard to distinguish; address that in a separate renderer loop with phone-size visual evidence.
