# Refactoring handleProcessNewStory

## Unexpected hurdles
- Running `npm run lint` auto-formatted unrelated files, so I had to restore them manually to keep the change focused.
- eslint's `complexity` rule is set extremely low (max 2), which meant even the extracted helpers still triggered warnings. I had to double-check the report to confirm each new function was still below the previous complexity of 14.

## Lessons for future work
- When the tooling auto-fixes broadly, review `git status` immediately to avoid sneaking in unrelated style-only edits.
- Capture the initial lint output (or the relevant snippet) before it gets overwritten so you can cite the original metrics later.

## Follow-up ideas
- The complexity rule could use a targeted override for Firestore triggers; otherwise every helper continues to warn despite being reasonable.
