## Assign moderation job query refactor

- **Challenge:** Needed to eliminate mutation of the Firestore query builder while keeping the chained operations readable.
- **Resolution:** Rebuilt the query using sequential `const` bindings for each stage (scoping, ordering, filtering, limiting) to preserve clarity without reassignments.
