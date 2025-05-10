---
description: How to extract conditional logic from a complex function to reduce cyclomatic complexity
---

1. Identify the function with high cyclomatic complexity (e.g., flagged by a linter or code review).

2. Review the function and locate conditional logic (if/else blocks, switch statements, ternaries, early returns, etc.) that contribute to complexity.

3. For each conditional block:
   - Determine if the condition and its associated logic can be expressed as a standalone function.
   - If so, define a new helper function (either locally or at module scope, as appropriate).
   - Move the conditional logic into the new function, giving it a descriptive name reflecting its purpose.
   - Replace the original conditional block in the complex function with a call to the new helper.

4. Repeat for all major conditionals until the main function reads as a high-level sequence of steps, with details delegated to helpers.

5. After each extraction:
   - Run the build and TCR scripts to ensure correctness and code quality.
   - Run the linter to check if complexity is reduced and if new warnings appear.

6. Continue until the function's complexity is within acceptable limits or all reasonable extractions have been made.

7. Ensure all tests still pass and that the function's behavior is unchanged.

// turbo-all
