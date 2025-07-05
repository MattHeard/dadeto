---
description: How to write characterization tests to improve test coverage
---

# Characterization Testing Workflow

A concise guide for systematically improving test coverage via characterization tests.

## Prerequisites

* Jest with coverage
* Existing tests
* Source code with uncovered lines

## Workflow Steps

### 1. Identify Code

```bash
npm test -- --coverage
```

### 2. Select Function

* Check coverage report (`reports/coverage/lcov.info`)
* Identify file and function with uncovered lines

### 3. Test File Structure

* Match `src/` to `test/` directories

### 4. Analyze

* Determine inputs for uncovered paths

### 5. Basic Test

```javascript
describe('functionName', () => {
  it('handles case', () => {
    const args = {};
    functionName(args);
  });
});
```

### 6. Run Tests

```bash
npm test -- path/to/file.test.js
```

### 7. Handle Results

* **Pass:** Add assertions
* **Error:** Assert expected errors
* **Fail:** Adjust and rerun

### 8. Add Assertions

* Check returns, state, side effects

### 9. Refine & Repeat

* Expand tests for other paths

## Linting

* Avoid disabling ESLint warnings
* Address and document remaining issues later

## Organization

* Use nested `describe` blocks clearly
* Simple, descriptive test names

## Test Data

* Use factory functions (`@faker-js/faker`) for realistic data

## Coverage Analysis

* Prioritize untested complex logic

## Debugging

* Use debug mode (`DEBUG=* npm test`)

## Performance

* Mock dependencies, limit DOM ops
* Run targeted tests (`npm test -- --onlyChanged`)

## Prohibited testing practices

* Do not use: jsdom, document, unstable_mockModule

## Creating Minimal Test Cases

When starting to test a complex function, begin with a minimal test case that only includes the function call with the bare minimum required arguments. This helps identify dependencies and required mocks.

### Steps:

1. **Start with an empty test case**
   ```javascript
   it('minimal test case', () => {
     functionUnderTest();
   });
   ```

2. **Add required arguments one by one** as tests fail
   - Start with empty objects/arrays for complex parameters
   - Add properties only when tests fail asking for them

3. **Mock dependencies** as they're discovered
   - Add mock implementations for required functions
   - Start with empty functions and add behavior as needed

4. **Example progression**:
   ```javascript
   // Start with minimal test
   it('minimal test case', () => {
     const elements = {};
     const processingFunction = () => '';
     const env = {};
     
     processInputAndSetOutput(elements, processingFunction, env);
   });
   
   // Then add required properties as tests fail
   it('minimal test case', () => {
     const elements = {
       inputElement: { value: '' },
       outputSelect: { value: 'text' },
       article: { id: 'test-article' }
     };
     const processingFunction = () => '';
     const env = {
       createEnv: () => ({
         get: () => ({
           getData: () => ({}),
           setData: () => {}
         })
       }),
       dom: {
         removeAllChildren: () => {},
         createElement: () => ({
           style: {},
           setAttribute: () => {}
         }),
         setTextContent: () => {},
         appendChild: () => {}
       }
     };
     
     processInputAndSetOutput(elements, processingFunction, env);
   });
   ```

5. **Only after the test passes** without assertions, start adding meaningful assertions

## Best Practices

* Focus tests on behavior
* Minimize setup and mocks
* After TCR has run, check whether the changes were reverted.
* Export and isolate internal logic for simpler tests
* Explicitly mock only necessary functions
* Add only one test case at a time and do not advance until all tests are passing.

## Example

### Source (`math.js`)

```javascript
export function divide(a, b) {
  if (b === 0) throw new Error('Division by zero');
  return a / b;
}
```

### Test (`math.test.js`)

```javascript
import { divide } from '../math';

describe('divide', () => {
  it('divides numbers correctly', () => {
    expect(divide(10, 2)).toBe(5);
  });

  it('throws on zero division', () => {
    expect(() => divide(10, 0)).toThrow('Division by zero');
  });
});
```