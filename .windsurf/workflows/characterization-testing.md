---
description: How to write characterization tests to improve test coverage
---

# Characterization Testing Workflow (Condensed)

This workflow guides systematic test coverage improvement via characterization tests.

## Prerequisites

* Jest with coverage
* Existing tests
* Source with uncovered lines

## Steps

### 1. Identify Untested Code

```bash
npm test -- --coverage
```

### 2. Select Function

* Open coverage report (`reports/coverage/lcov.info`)
* Choose file with uncovered lines
* Identify target function

### 3. Locate/Create Test Suite

* **Browser code** (`src/browser/`):
  - `src/browser/file.js` → `test/browser/file.test.js`
* **Toys** (`src/toys/`):
  - `src/toys/YYYY-MM-DD/toyName.js` → `test/toys/YYYY-MM-DD/toyName.test.js`
* **Presenters** (`src/presenters/`):
  - `src/presenters/presenterName.js` → `test/presenters/presenterName.test.js`
* **Utils** (`src/utils/`):
  - `src/utils/utilName.js` → `test/utils/utilName.test.js`

### 4. Analyze Function

* Review parameters and return values
* Determine inputs for untested paths

### 5. Write Basic Test

```javascript
describe('functionName', () => {
  it('handles [specific case]', () => {
    const args = {/* arguments */};
    const result = functionName(args);
    // No assertions initially
  });
});
```

### 6. Run Test

```bash
npm test -- path/to/file.test.js
```

### 7. Handle Test Results

* **Pass:** Add assertions, then:

```bash
npm run build && npm run tcr
```

* **Expected error:**

```javascript
expect(() => functionName(args)).toThrow();
```

* **Programming error:** Revert changes (`npm run tcr`), adjust test.

### 8. Add Assertions

* Validate return values, side effects, state, or mocked calls

### 9. Refine and Repeat

* Clarify assertions
* Add diverse input tests
* Repeat for other untested paths

## Handling Lint Warnings

When writing characterization tests, you may encounter lint warnings that aren't directly related to the test's functionality. Here's how to handle them:

1. **Temporarily Ignore Warnings**
   - Focus on test functionality first
   - Use `// eslint-disable-next-line` comments for specific rules when necessary
   - Example: `// eslint-disable-next-line no-unused-vars`

2. **Common Test-Specific Linting**
   - Ignore unused variables in test setup (e.g., `_` for unused parameters)
   - Suppress complexity warnings for test utilities
   - Disable specific rules at the file level if needed

3. **Clean Up After**
   - Once tests are passing, review and address any remaining lint warnings
   - Consider refactoring test utilities if they trigger complexity warnings
   - Document intentional rule violations with comments

## Best Practices

* Simple tests, increment complexity
* One behavior per test
* Descriptive test names
* Minimal, clear setup
* Test behaviors, not internal implementations
* Test public interfaces
* Avoid unnecessary mocks
* Address lint warnings after establishing test coverage

## Avoiding JSDOM for Mutation Testing

* Avoid global `document`; use simple mock objects:

```javascript
const element = { textContent: '', className: '', appendChild: jest.fn() };
```

* Mock DOM utilities explicitly:

```javascript
const dom = { createElement: jest.fn(() => ({ textContent: '', className: '' })) };
```

* Dependency injection for easier mocking:

```javascript
function updateElement(getElement) {
  const el = getElement('my-element');
  el.textContent = 'Updated';
}
```

* Test event handlers directly with mock events:

```javascript
const event = { preventDefault: jest.fn() };
handleClick(event);
```

## Exporting Functions for Testability

* Export internal logic separately:

```javascript
export function cleanInput(input) { return input.trim().toLowerCase(); }
function processData(input) { return cleanInput(input); }
```

* Test the exported functions individually:

```javascript
import { cleanInput } from '../dataProcessor';
describe('cleanInput', () => {
  it('trims and lowercases input', () => {
    expect(cleanInput('  TEST  ')).toBe('test');
  });
});
```

## ES Module Mocking Guidelines

* Mock specific functions explicitly:

```javascript
import { functionToMock } from '../module';
jest.mock('../module', () => ({
  ...jest.requireActual('../module'),
  functionToMock: jest.fn()
}));
```

* Prefer testing error handling via public APIs or dependency injection.
* Verify observable outcomes rather than internal implementations.

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

  it('throws error on division by zero', () => {
    expect(() => divide(10, 0)).toThrow('Division by zero');
  });
});
```
