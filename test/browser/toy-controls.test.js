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

  it('fetches from URL if processingFunction returns a request object', async () => {
    const mockFetchFn = jest.fn(() =>
      Promise.resolve({ text: () => Promise.resolve('fetched content') })
    );

    processingFunction = jest.fn(() =>
      JSON.stringify({ request: { url: 'https://example.com/data' } })
    );

    const stopDefault = (e) => e.preventDefault();
    const createEnv = () => ({});
    const errorFn = jest.fn();
    const addWarningFn = jest.fn();

    const handleSubmitWithFetch = createHandleSubmit(
      inputElement,
      outputElement,
      {},
      processingFunction,
      stopDefault,
      createEnv,
      errorFn,
      addWarningFn,
      mockFetchFn
    );

    await handleSubmitWithFetch(new Event('submit'));

    expect(mockFetchFn).toHaveBeenCalledWith('https://example.com/data');
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(outputElement.textContent).toBe('fetched content');
  });

  it('handles fetch failure if request URL is unreachable', async () => {
    const mockFetchFn = jest.fn(() =>
      Promise.reject(new Error('Network failure'))
    );

    processingFunction = jest.fn(() =>
      JSON.stringify({ request: { url: 'https://example.com/fail' } })
    );

    const stopDefault = (e) => e.preventDefault();
    const createEnv = () => ({});
    const errorFn = jest.fn();
    const addWarningFn = jest.fn();

    const handleSubmitWithFailingFetch = createHandleSubmit(
      inputElement,
      outputElement,
      {},
      processingFunction,
      stopDefault,
      createEnv,
      errorFn,
      addWarningFn,
      mockFetchFn
    );

    await handleSubmitWithFailingFetch(new Event('submit'));

    await new Promise(resolve => setTimeout(resolve, 0));
    expect(mockFetchFn).toHaveBeenCalledWith('https://example.com/fail');
    expect(errorFn).toHaveBeenCalledWith('Error fetching request URL:', expect.any(Error));
    expect(outputElement.textContent).toMatch(/Error fetching URL: Network failure/);
    expect(addWarningFn).toHaveBeenCalledWith(outputElement);
  });

  it('handles error thrown by processingFunction', async () => {
    const mockFetchFn = jest.fn(); // Should not be called

    processingFunction = jest.fn(() => {
      throw new Error('processing error');
    });

    const stopDefault = (e) => e.preventDefault();
    const createEnv = () => ({});
    const errorFn = jest.fn();
    const addWarningFn = jest.fn();

    const handleSubmitThrowing = createHandleSubmit(
      inputElement,
      outputElement,
      {},
      processingFunction,
      stopDefault,
      createEnv,
      errorFn,
      addWarningFn,
      mockFetchFn
    );

    await handleSubmitThrowing(new Event('submit'));

    expect(mockFetchFn).not.toHaveBeenCalled();
    expect(errorFn).toHaveBeenCalledWith('Error processing input:', expect.any(Error));
    expect(outputElement.textContent).toMatch(/Error: processing error/);
    expect(addWarningFn).toHaveBeenCalledWith(outputElement);
  });
});
