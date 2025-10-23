# Verify admin ternary removal

* **Challenge:** The lint pass flagged `defaultGetAuthHeader` in `src/core/cloud/mark-variant-dirty/verifyAdmin.js` for using a ternary operator, triggering the `no-ternary` rule while the surrounding logic still needed to gracefully handle missing `req.get` helpers.
* **Resolution:** Replaced the ternary with early returns that validate the request object and normalize the header lookup, preserving behavior while satisfying the lint rule.
