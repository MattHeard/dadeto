# LEDG2 blog order fix

- Unexpected hurdle: the `bd` CLI workflow required by repo docs was unavailable (`bd: command not found`), so loop tracking could not be recorded there.
- Diagnosis path: searched `public/blog.json` and `src/build/blog.json` for `LEDG2` and confirmed the newer `2026-03-30` entry appeared after older `2026-03-13`.
- Chosen fix: reordered the two top ledger toy entries in both JSON files so posts remain reverse-chronological.
- Next-time guidance: add an automated ordering check in tests/build validation to catch publication date misordering before merge.
