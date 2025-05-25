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
- Prefer testing public interfaces over internal implementation details
- When testing, think about the behavior from the consumer's perspective
- Don't mock functions unless they are injected into the function under test

## Avoiding JSDOM and Document Usage

To ensure compatibility with mutation testing tools like Stryker, follow these guidelines:

1. **Avoid using the global `document` object**
   - Instead of creating real DOM elements, use simple mock objects
   - Example:
     ```javascript
     // Instead of:
     const element = document.createElement('div');
     
     // Use:
     const element = { 
       textContent: '',
       className: '',
       appendChild: jest.fn(),
       removeChild: jest.fn(),
       // Add other required properties/methods as needed
     };
     ```

2. **Mock DOM utilities**
   - Create simple mock implementations of DOM manipulation functions
   - Example:
     ```javascript
     const dom = {
       createElement: jest.fn(tag => ({
         tagName: tag.toUpperCase(),
         textContent: '',
         className: '',
         setAttribute: jest.fn(),
         appendChild: jest.fn(),
         removeChild: jest.fn()
       })),
       setTextContent: jest.fn(),
       addClass: jest.fn(),
       // Add other DOM methods as needed
     };
     ```

3. **Test behavior, not implementation**
   - Focus on testing the function's output and side effects rather than DOM structure
   - Example:
     ```javascript
     // Instead of:
     expect(element.innerHTML).toContain('<div class="error">');
     
     // Test the behavior:
     expect(dom.setTextContent).toHaveBeenCalledWith(
       expect.anything(),
       'Error message'
     );
     ```

4. **Use dependency injection**
   - Pass DOM utilities as parameters to make them easier to mock
   - Example:
     ```javascript
     // Instead of:
     function updateElement() {
       const el = document.getElementById('my-element');
       el.textContent = 'Updated';
     }
     
     // Use:
     function updateElement(getElement) {
       const el = getElement('my-element');
       el.textContent = 'Updated';
     }
     ```

5. **For event handling**
   - Test event handlers by calling them directly with mock events
   - Example:
     ```javascript
     // Instead of:
     const event = new Event('click');
     button.dispatchEvent(event);
     
     // Test the handler directly:
     const event = { preventDefault: jest.fn() };
     handleClick(event);
     expect(event.preventDefault).toHaveBeenCalled();
     ```

## Testing Without JSDOM: Example

Here's an example of how to test a function that manipulates the DOM without using JSDOM:

```javascript
// Function to test
export function updateStatus(element, status) {
  element.textContent = status;
  element.className = `status-${status.toLowerCase()}`;
}

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
