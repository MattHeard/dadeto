# Parameter bag arity lint

- Unexpected hurdle: the first full check exposed fresh coverage branches and the core parse gate correctly rejected AST inspection placed in `src/core/lint`.
- Diagnosis: ESLint rules interpret ASTs, so implementation belongs at the existing `src/core/scripts` boundary; `src/core/lint` should only re-export the rule. Focused RuleTester coverage then brought the implementation to 100% across lines, statements, functions, and branches.
- Chosen fix: added syntax-based effective-arity detection for direct object patterns and top-level object destructuring, including nested/default/rest bindings, while exempting whole-object use. Registered the rule and added 15 focused cases. Kept existing max-params and no-inline-config policies.
- Next-time guidance: before enabling this rule repository-wide, work through the 198 existing reports recorded in `dadeto-g6qi`; do not suppress them or weaken the syntactic rule to make the baseline green.
- Environment note: repeated Jest runs filled `/tmp` with a 1.9 GB transform cache and caused `ENOSPC`. Removing only `/tmp/jest_rs` restored space; run the full check after clearing disposable caches if this recurs.
