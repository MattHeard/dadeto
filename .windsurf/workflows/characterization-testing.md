---
description: How to write characterization tests to improve test coverage
---
# Characterization Testing Workflow

This workflow helps you systematically improve test coverage by writing characterization tests for untested code paths.

## Prerequisites
- Jest test runner with coverage enabled
- Existing test suite
- Source code with uncovered lines (as shown in coverage report)

## Steps

### 1. Identify Untested Code
```bash
# Run tests with coverage
npm test -- --coverage

# Or to run a specific test file with coverage
npm test -- path/to/test/file.test.js --coverage
```

### 2. Select a Function to Test
- Open the coverage report (typically in `coverage/lcov-report/index.html`)
- Find a file with uncovered lines
- Identify the function containing those lines

### 3. Locate the Test Suite
- Find or create a test file for the function
- Convention: `path/to/function.js` → `path/to/__tests__/function.test.js`

### 4. Analyze the Function
- Review the function's parameters and return value
- Identify the control flow that leads to the untested line
- Determine what inputs would exercise that path

### 5. Write a Basic Test
```javascript
// Example test structure
describe('functionName', () => {
  it('should handle [specific case]', () => {
    // Arrange
    const args = { /* necessary arguments */ };
    
    // Act
    const result = functionName(args);
    
    // Assert - start with no assertions
  });
});
```

### 6. Run the Test
```bash
# Run the specific test in watch mode
npm test -- path/to/test/file.test.js --watch
```

### 7. Handle Test Results

#### If the test passes:
- Add assertions to verify the function's behavior
- Run build and TCR:
  ```bash
  npm run build && npm run tcr
  ```

#### If the test fails with an error:
- If the error is expected, add an assertion for it:
  ```javascript
  expect(() => functionName(args)).toThrow();
  // or
  expect(() => functionName(args)).toThrow('Expected error message');
  ```

#### If the test fails due to a programming error:
- Revert changes using TCR:
  ```bash
  npm run tcr
  ```
- Return to step 5 and adjust your test case

### 8. Add Meaningful Assertions
- For passing tests, add assertions that verify:
  - Return values
  - Side effects
  - State changes
  - Function calls (if using mocks)

### 9. Refine and Repeat
- Make assertions more specific as you understand the behavior
- Add more test cases for different input scenarios
- Repeat the process for other untested code paths

## Best Practices
- Start with simple test cases and build up complexity
- Focus on one behavior per test
- Use descriptive test names that explain the scenario
- Keep test setup clear and minimal
- Don't test implementation details, focus on behavior
- Use snapshots sparingly and prefer specific assertions

## Example

### Source Code (`src/math.js`)
```javascript
export function divide(a, b) {
  if (b === 0) {
    throw new Error('Division by zero');
  }
  return a / b;
}
```

### Test File (`src/__tests__/math.test.js`)
```javascript
import { divide } from '../math';

describe('divide', () => {
  it('should divide two numbers', () => {
    const result = divide(10, 2);
    expect(result).toBe(5);
  });

  it('should throw when dividing by zero', () => {
    expect(() => divide(10, 0)).toThrow('Division by zero');
  });
});
```
