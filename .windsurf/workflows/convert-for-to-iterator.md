---
description: How to convert for loops to iterator methods with arrow functions
---

To convert a for loop into an iterator method (such as .map, .filter, .reduce, .find, .every, .some, or .forEach) using an arrow function, follow these steps:

1. Identify the for loop and its control variables.
2. Determine the purpose of the loop (e.g., transformation, filtering, search, aggregation, side effects).
3. Choose the appropriate iterator method for the purpose:
   - Use `.map` for transformation.
   - Use `.filter` for filtering elements.
   - Use `.reduce` for aggregation.
   - Use `.find` for searching for the first match.
   - Use `.every`/`.some` for boolean checks.
   - Use `.forEach` for side effects only.
4. Replace the for loop with the chosen iterator method, using an arrow function for the callback.
5. Refactor the loop body into the arrow function, using the element and index parameters as needed.
6. Ensure the new code produces the same result as the original for loop (test if possible).
7. Remove the original for loop after confirming correctness.

Example:

Before:
```js
let sum = 0;
for (let i = 0; i < arr.length; i++) {
  sum += arr[i];
}
```
After:
```js
const sum = arr.reduce((acc, x) => acc + x, 0);
```

This workflow can be applied to any for loop that can be expressed as an iterator method with an arrow function.
