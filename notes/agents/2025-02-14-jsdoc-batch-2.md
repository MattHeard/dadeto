# JSDoc cleanup batch 2

- **Challenge:** `jsdoc/no-undefined-types` flagged browser-specific fetch signatures (`RequestInfo`, `RequestInit`, `NodeListOf`) that ESLint does not recognize in this project.
- **Resolution:** Introduced local typedefs and normalized the annotations to project-friendly types, then rewrote the affected docblocks so the linter accepts them without needing global type declarations.
