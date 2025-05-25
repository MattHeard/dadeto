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

* Temporarily disable unrelated warnings (`// eslint-disable-next-line`)
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