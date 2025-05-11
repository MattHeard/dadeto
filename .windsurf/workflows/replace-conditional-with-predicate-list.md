---
description: How to replace a conditional chain with a list of predicate/value pairs for normalization or dispatch logic
---

This workflow describes how to refactor a function that uses a conditional chain (if/else or switch) into a declarative, extensible list of predicate/value pairs. This pattern improves readability, maintainability, and extensibility, especially for normalization or dispatch logic.

### Steps

1. **Identify the Conditional Chain**
   - Locate the function that uses a series of if/else or switch/case statements to select a result based on input.

2. **Extract Predicate Functions and Values**
   - For each branch in the conditional, extract the test as a predicate function (e.g., `c => Array.isArray(c)`).
   - Extract the corresponding return value or object for each branch.

3. **Create a List of [Predicate, Value] Pairs**
   - Define a local array (e.g., `const tests = [[predicate1, value1], [predicate2, value2], ...]`).
   - Each entry should be a tuple: `[predicate, value]`.

4. **Replace the Conditional with a Declarative Lookup**
   - Use `.find(([predicate]) => predicate(input))` to locate the first matching pair.
   - Return the associated value if found; otherwise, return a default or fallback.

   Example:
   ```js
   function normalizeContentItem(content) {
     const tests = [
       [c => Array.isArray(c), { type: 'quote', content }],
       [c => typeof c !== 'object' || c === null, { type: 'text', content }],
     ];
     const found = tests.find(([predicate]) => predicate(content));
     return found ? found[1] : content;
   }
   ```

5. **Test and Validate**
   - Run your test suite to ensure behavior is unchanged.
   - If the function is part of a critical path, run additional edge case tests.

6. **Document and Commit**
   - Add comments explaining the pattern and why it was chosen.
   - Commit with a message like: "Refactor normalization logic to use predicate/value list."

### Benefits
- **Extensibility:** Add new cases by appending to the list.
- **Readability:** Logic is linear and declarative.
- **DRY:** Avoids duplicate dispatch or normalization logic.

### When to Use
- Normalization functions
- Dispatch tables with special-case logic
- Any function with a growing or complex conditional chain

---
This workflow helps keep your codebase clean, extensible, and easy to reason about. If you have further questions or want to automate this pattern, let Cascade know!
