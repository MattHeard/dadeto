# Prod update variant visibility JSDoc cleanup
- The repo's lint script auto-applies fixes across the tree, so I had to revert unrelated edits after running it.
- Counting remaining warnings in `src/core/` required scripting against `reports/lint/lint.txt` because ESLint's output is aggregated by file.
