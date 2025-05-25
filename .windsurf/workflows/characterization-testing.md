---
description: How to write characterization tests to improve test coverage
---
# Characterization Testing Workflow

Systematically improve test coverage by focusing on one function at a time, adding one test case at a time, and ensuring all tests pass before proceeding.

## Quick Start

1. Run coverage: `npm test -- --coverage`
2. Pick one untested function
3. Add one test case
4. Run test: `npm test -- path/to/test.js --watch`
5. If test passes: `npm run tcr`
6. Repeat until function is fully covered

## Detailed Steps

### 1. Select a Function
- Run `npm test -- --coverage`
- Check `coverage/lcov-report/index.html`
- Choose one function with low coverage

### 2. Create Test File (if needed)
```javascript
// test/path/to/function.test.js
import { functionName } from '../../src/path/to/function.js';

describe('functionName', () => {
  // Add one test case at a time
});
```

### 3. Add One Test Case
```javascript
it('should [expected behavior] when [condition]', () => {
  // Arrange - minimal setup
  const input = { /* specific values */ };
  
  // Act - call the function
  const result = functionName(input);
  
  // Assert - verify outcome
  expect(result).toBe(/* expected value */);
});
```

### 4. Run and Verify
```bash
npm test -- test/path/to/test.js --watch
```

### 5. Handle Results
- **Test passes**:
  1. Add assertions if needed
  2. Commit with TCR: `npm run tcr`
  3. Add next test case

- **Test fails**:
  1. If expected: add assertion for error
  2. If unexpected: fix test or document bug
  3. Run TCR to revert if needed

## Best Practices

### Test Structure
- One behavior per test
- Start with happy path
- Add edge cases
- Test error conditions

### Mocking DOM
```javascript
// Instead of real DOM elements
const mockElement = {
  textContent: '',
  className: '',
  appendChild: jest.fn(),
  removeChild: jest.fn()
};

// Mock event handlers
const mockEvent = {
  preventDefault: jest.fn(),
  target: { value: 'test' }
};
```

### Assertions
- Test behavior, not implementation
- Verify side effects
- Check return values
- Test error cases

## Workflow Rules
1. One function at a time
2. One test case per commit
3. Always run TCR after each change
4. Keep tests focused and simple

// Test
describe('updateStatus', () => {
  it('updates element text and class based on status', () => {
    // Arrange
    const element = {
      textContent: '',
      className: ''
    };
    const status = 'SUCCESS';
    
    // Act
    updateStatus(element, status);
    
    // Assert
    expect(element.textContent).toBe('SUCCESS');
    expect(element.className).toBe('status-success');
  });
});
```

## Exporting Functions for Testability

When encountering untested code that's difficult to test, consider exporting the function to make it testable. This is particularly useful for:

1. **Pure functions** that don't have side effects
2. **Helper functions** that are used internally but can be tested in isolation
3. **Complex logic** that's buried inside larger functions

### How to export a function for testing:

1. **Identify** the function that contains the logic you want to test
2. **Export** the function (if it's not already exported)
3. **Write tests** for the exported function
4. **Keep the original function** that calls it for backward compatibility

Example:

```javascript
// Before (difficult to test)
function processData(input) {
  const cleaned = input.trim().toLowerCase();
  // Complex logic here...
  return result;
}

// After (testable)
export function cleanInput(input) {
  return input.trim().toLowerCase();
}

function processData(input) {
  const cleaned = cleanInput(input);
  // Rest of the logic...
  return result;
}

export { processData }; // If it needs to be exported
```

Then test the individual function:

```javascript
import { cleanInput } from '../dataProcessor';

describe('cleanInput', () => {
  it('should trim whitespace and convert to lowercase', () => {
    expect(cleanInput('  TEST  ')).toBe('test');
  });
});
```

> **Note:** While we focus on increasing test coverage in this workflow, remember that you can later refactor the exported functions to have a cleaner public API using the [Simplify Exported Functions Workflow](./simplify-exported-functions.md).

## ES Module Mocking Guidelines

When working with ES modules, follow these patterns instead of using `jest.requireActual`:

### For mocking specific functions:

```javascript
// At the top of your test file
import { functionToMock } from '../path/to/module';

jest.mock('../path/to/module', () => ({
  ...jest.requireActual('../path/to/module'),
  functionToMock: jest.fn()
}));

describe('test suite', () => {
  it('should test something', () => {
    // Test implementation
  });
});
```

### For testing error cases:

Instead of trying to mock the implementation, consider:
1. Testing the error handling behavior
2. Using dependency injection to provide test doubles
3. Testing the error state through the public API

### For testing side effects:

1. Test the observable outcome rather than implementation details
2. If you need to verify side effects, use the public API to check the results
3. Consider restructuring the code to make it more testable if needed

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
