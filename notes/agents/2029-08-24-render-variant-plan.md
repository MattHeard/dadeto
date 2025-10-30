# Render variant complexity split

## What surprised me
- I expected ESLint's complexity warning on `render` to be moderate because the function only had a few `if` branches, but every logical operator counted toward the score. That kept the warning high even after trimming obvious conditionals.

## How I diagnosed it
- Re-ran `npm run lint` after each refactor to watch the complexity numbers. Seeing the warning persist made it clear we needed to move substantial logic into helpers and not just reorder statements.
- Checked the generated lint report to confirm the new helpers' scores, ensuring each landed below the original 18.

## Next time
- When splitting large Firestore handlers, draft a "plan" helper that gathers data and a "persist" helper that writes side effects. That structure kept responsibilities clean and made it easy to unit test in isolation if we decide to.
- Remember that ESLint counts both ternaries and logical operators, so moving guard clauses into dedicated helpers is often the quickest path to dropping the reported complexity.
