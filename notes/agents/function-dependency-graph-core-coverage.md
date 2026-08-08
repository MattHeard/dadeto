# Function dependency graph core coverage

- Unexpected hurdle: coverage exposed branches for malformed import/call AST nodes and an importer-map fallback that could not occur after a file had been parsed.
- Diagnosis: the parser contract permits incomplete nodes in defensive tests, while `importsByFile` is populated for every file before dependency resolution.
- Fix: added a synthetic incomplete-AST test and removed the invariant-unreachable `?? new Map()` fallback.
- Next-time guidance: cover defensive AST guards with explicit sparse nodes, and simplify branches whose preconditions are established by the same function.
