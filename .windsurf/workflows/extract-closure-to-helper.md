---
description: Extract Inline Closure to Top-Level Helper
---

# Windsurf Workflow: Extract Inline Closure to Top-Level Helper

**Goal:** Refactor complex or inline closures inside functions into top-level, reusable helpers to improve readability, testability, and maintainability.

---

## Steps

1. **Identify Inline Closures**
   - Locate arrow functions or closures defined inside larger functions (e.g., reducers, predicates, small utilities).
   - Example: The inline reducer in `placeShip`.

2. **Extract to Local Variable**
   - Assign the closure to a named local variable within the function.
   - _Why:_ This makes the logic easier to reference and prepares for promotion.

3. **Create a Closure Factory (if needed)**
   - If the closure depends on outer-scope variables, create a factory function that takes those dependencies as arguments and returns the closure.
   - Example:
     ```js
     function makeSegReducer(dir, x, y, occupied) {
       return (acc, _, i) => { ... };
     }
     ```

4. **Move Factory to Module Scope**
   - Relocate the closure factory to the top/module level, near other helpers.
   - Replace the inline definition with a call to the new top-level function.

5. **Update All Usages**
   - Ensure all calls to the closure or reducer now use the promoted factory.
   - Remove any now-unused inline definitions.

6. **Run Build and TCR**
   - Run `npm run build` to ensure the code still builds.
   - Run `npm run tcr` to verify all tests pass and changes are committed or reverted as appropriate.

---

## Example: From Inline to Top-Level Helper

**Before:**
```js
function placeShip(...) {
  ...
  const segReducer = (acc, _, i) => { ... };
  Array.from({ length: len }).reduce(segReducer, ...);
  ...
}
```

**After:**
```js
function makeSegReducer(dir, x, y, occupied) {
  return (acc, _, i) => { ... };
}

function placeShip(...) {
  ...
  const segReducer = makeSegReducer(dir, x, y, occupied);
  Array.from({ length: len }).reduce(segReducer, ...);
  ...
}
```

---

## Automatable Steps
- Search for inline arrow functions inside functions.
- Suggest or automatically extract to a named variable.
- Detect dependencies and suggest a closure factory if needed.
- Promote to module scope and update all usages.
- Run build and TCR scripts after each refactor.
