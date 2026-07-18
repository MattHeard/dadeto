# Author dirty-render flow

- Unexpected hurdle: the repository-wide check still reports pre-existing lint and TSDoc failures, and coverage is just below the strict branch threshold.
- Diagnosis: render-variant was coupling author metadata lookup to Cloud Storage writes; the new author trigger needs to own page persistence and dirty-state clearing.
- Fix: render-variant updates the author document with its current name and `dirty: true`; the new `render-author` Firestore trigger writes `a/{uuid}.html` and removes `dirty`.
- Next time: run the focused ESM Jest command with `NODE_OPTIONS=--experimental-vm-modules`; use the full check to distinguish baseline gate failures from this flow.
