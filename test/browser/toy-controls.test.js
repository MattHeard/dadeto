import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { enableInteractiveControls } from '../../src/browser/toy-controls.js'; // Adjust path as needed

describe('enableInteractiveControls', () => {
  let inputElement;
  let submitButton;
  let outputElement;
  let parentElement;
  let mockParentClassList;

  beforeEach(() => {
    // Mock input element
    inputElement = { disabled: true };

    // Mock submit button
    submitButton = { disabled: true };

    // Mock parent element with classList mock
    mockParentClassList = {
      containsWarning: true, // Simple state to track the class
      add: jest.fn(), // Not strictly needed for this test, but good practice
      remove: jest.fn((className) => {
        if (className === 'warning') {
          mockParentClassList.containsWarning = false;
        }
      }),
      contains: jest.fn((className) => {
        return className === 'warning' && mockParentClassList.containsWarning;
      })
    };
    parentElement = { 
      classList: mockParentClassList,
      appendChild: jest.fn() // Not needed, but completes the mock
    };

    // Mock output element and link its parent
    outputElement = { 
      textContent: '',
      parentElement: parentElement
    };
    
  });

  it('enables input and submit button', () => {
    enableInteractiveControls(inputElement, submitButton, outputElement);
    expect(inputElement.disabled).toBe(false);
    expect(submitButton.disabled).toBe(false);
  });

  it('sets output textContent to "Ready for input"', () => {
    enableInteractiveControls(inputElement, submitButton, outputElement);
    expect(outputElement.textContent).toBe('Ready for input');
  });

  it('removes "warning" class from parent element', () => {
    // Check initial state using the mock
    expect(parentElement.classList.contains('warning')).toBe(true);
    enableInteractiveControls(inputElement, submitButton, outputElement);
    // Check that remove was called
    expect(parentElement.classList.remove).toHaveBeenCalledWith('warning');
    // Check final state using the mock
    expect(parentElement.classList.contains('warning')).toBe(false);
  });
});

import { createHandleSubmit } from '../../src/browser/toy-controls.js';

describe('createHandleSubmit', () => {
  let mockFetch;
  let inputElement;
  let outputElement;
  let handleSubmit;
  let processingFunction;

  beforeEach(() => {
    inputElement = { value: 'hello', disabled: false };
    outputElement = { textContent: '', parentElement: { classList: { add: jest.fn(), remove: jest.fn() } } };

    mockFetch = jest.fn();
    global.fetch = mockFetch;

    const noop = () => {};
    const globalState = {};
    processingFunction = jest.fn(async (input) => 'transformed');
    const stopDefault = (e) => e.preventDefault();
    const createEnv = () => ({});
    const errorFn = noop;
    const addWarningFn = noop;

    handleSubmit = createHandleSubmit(
      inputElement,
      outputElement,
      globalState,
      processingFunction,
      stopDefault,
      createEnv,
      errorFn,
      addWarningFn
    );
  });

  it('characterizes current basic behavior on submit', async () => {
    await handleSubmit(new Event('submit'));

    // Characterization: ensure processingFunction is called
    expect(processingFunction).toHaveBeenCalled();

    // Characterization: ensure output is updated with result
    await expect(outputElement.textContent).resolves.toEqual('transformed');
  });
});
