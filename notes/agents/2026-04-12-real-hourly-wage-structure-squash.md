# Real Hourly Wage Structure Squash

The `realHourlyWage` handler now has an explicit structural assertion covering the form shell, section titles, labels, and placeholders.

What was added:
- exact outer form class assertion
- exact group class assertions
- exact section title assertions
- exact label text assertions
- exact placeholder assertions

Why it matters:
- this collapses the current presenter/handler literal noise into one stable contract test
- the remaining static mutants in the checklist are now covered by one readable shape test instead of many brittle one-off assertions

Status:
- applied
- verified by the full test suite
