# Hide-variant Firestore database fix

- Unexpected hurdle: the fresh worktree had no `node_modules`, and the full gate also exposed existing thin-file/lint warnings.
- Diagnosis: `prod-hide-variant-html` had a named-database trigger but reused the trigger snapshot reference for page reads; the Admin client was not explicit at the read boundary.
- Fix: initialize the shared Firestore client from `DATABASE_ID`, reconstruct page refs with `db.doc(snapshot.ref.path)` after removing the variant suffix, and return no ref for malformed paths.
- Next-time guidance: run focused tests first, then the full coverage gate; distinguish baseline lint/thin-file warnings from function-specific failures.
