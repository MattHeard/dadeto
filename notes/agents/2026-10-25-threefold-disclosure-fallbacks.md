# Threefold saved disclosure fallback coverage

- Unexpected hurdle: The main saved-disclosure regression exercised records with both a title and direct text, leaving renderer fallbacks uncovered.
- Diagnosis: Field Notes builds each record from optional `title`, `text`, or `paragraphs`; missing values must be handled without displaying undefined or throwing.
- Fix: Added a Y > Field Notes regression with a paragraphs-only disclosure and an empty disclosure. It verifies the fallback `FIELD NOTE` title, joined paragraphs, and safe empty content.
- Evidence: Focused menu Jest passed 14/14. `/tmp/threefold-menu-disclosure-fallback-coverage/coverage-final.json` records both outcomes on `page.js:582`: `[6,4]`, `[6,4]`, and `[4,2]`. The focused invocation reports nonzero only because it applies global 100% thresholds to one-file coverage. Elevated `DADETO_CHECK_PROGRESS_INTERVAL_MS=3000 npm run check` passed all 10 gates across six impact shards. Spec refresh and `git diff --check` passed.
- Next: Continue working from the latest Full Check artifact. Keep all thresholds and exclusions unchanged.
