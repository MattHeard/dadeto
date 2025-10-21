# ESLint complexity warning cleanup for getRowsJson

- **Challenge:** The `complexity` rule flagged `getRowsJson` in `src/browser/toys.js`, and a direct guard using logical operators triggered the same rule when extracting DOM helpers.
- **Resolution:** Extracted reusable helpers to choose the first non-blank value and to safely call `dom.getValue`, reducing branching while keeping the DOM helper invocation intact.
