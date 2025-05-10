---
description: How to group related function parameters into a cohesive object
---

1. **Review Function Parameters:**
   - List all parameters of the function.
   - For each parameter, consider its purpose and relationship to others.

2. **Identify Cohesive Groups:**
   - Group parameters that represent a shared concept or state (e.g., board state, config + runtime state).
   - Leave unrelated or primitive values (e.g., numbers, strings, external dependencies) as standalone parameters.

3. **Create a Grouped Object:**
   - Define a new object (e.g., `boardState`) that includes the grouped parameters.
   - Update the function signature to accept the grouped object and the remaining standalone parameters.

4. **Update Call Sites:**
   - Refactor all usages of the function to pass the grouped object and standalone parameters accordingly.
   - Destructure the grouped object inside the function if needed.

5. **Verify Functionality:**
   - Run tests, build, and lint to ensure correctness and code quality.

6. **Iterate as Needed:**
   - If further grouping or ungrouping improves clarity, repeat the process.

// turbo-all
