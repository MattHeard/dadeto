## Report for Moderation handler lint cleanup

* Encountered ESLint complexity warnings triggered by the repository's strict threshold of 2. Splitting validation logic into small helpers kept the public handler simple while satisfying the rule.
* Optional chaining and ternary operators unexpectedly counted toward complexity. Rewriting the guard to avoid ternaries and introducing a dedicated `hasVariantString` helper eliminated the warning.
