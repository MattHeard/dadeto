# Reflection

- **Unexpected hurdle:** I underestimated how aggressively our ESLint configuration counts cyclomatic complexity—optional chaining and guard clauses quickly tripped the limit, and introducing a helper without reshaping the logic simply moved the warning around. It forced me to iteratively refactor until the branching was genuinely reduced instead of just relocated.
- **Diagnosis:** Re-running `npm run lint` after each tweak made it obvious which functions still exceeded the threshold. The lint report highlighted new helpers like `parsePageVariantInput`, so I traced through the code to understand which conditions were still contributing to the score.
- **Resolution options considered:**
  - Keep the helper but accept a higher complexity (rejected—the rule would keep complaining).
  - Collapse checks into ternaries (rejected because of the repo-wide `no-ternary` rule).
  - Split the parsing logic into multiple, single-purpose helpers so each function only owns one or two decisions (chosen).
- **Lesson for future agents:** When tackling complexity warnings here, aim for decomposing by responsibility rather than just extracting chunks verbatim. After each extraction, re-run the linter immediately; the `reports/lint/lint.txt` output is the quickest way to confirm whether you truly lowered the cyclomatic cost.
- **Open question:** It might be worth introducing a shared utility for parsing “page + variant” identifiers since the same pattern probably exists elsewhere—worth exploring in a follow-up to avoid duplication.
