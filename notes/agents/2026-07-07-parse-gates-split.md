# Parse gates split

- Hurdle: the first boundary detector flagged ordinary coercions across many `src/core` files, which made the gate unusable.
- Diagnosis: the heuristic was too broad; it treated internal domain parsing as boundary leakage instead of targeting concrete raw-source inputs.
- Fix: split the check into `parse-not-validate` and `parse-boundary`, then narrowed the boundary detector to explicit external-input signals and known adapter subtrees.
- Next time: start with a small reward-hack fixture set and verify the gate against live repo files before tightening the match scope.
