import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { enableInteractiveControls } from '../../src/browser/toys.js'; // Adjust path as needed

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

import { createHandleSubmit, initializeInteractiveComponent, initializeVisibleComponents, handleModuleError } from '../../src/browser/toys.js';

describe('createHandleSubmit', () => {
  let mockFetch;
  let inputElement;
  let outputElement;
  let handleSubmit;
  let processingFunction;
  let parentElement;
  let setTextContent;
  let dom;
  let createEnv;
  let errorFn;
  let addWarningFn;
  let createElement;
  let stopDefault;

  beforeEach(() => {
    inputElement = { value: 'hello', disabled: false };
    outputElement = { textContent: '', parentElement: { classList: { add: jest.fn(), remove: jest.fn() } } };
    setTextContent = jest.fn();
    stopDefault = jest.fn();
    addWarningFn = jest.fn();
    createElement = jest.fn();
    dom = { createElement, setTextContent, stopDefault, addWarningFn };
    mockFetch = jest.fn();
    global.fetch = mockFetch;

    const globalState = {};
    processingFunction = jest.fn(async (input) => 'transformed');
    createEnv = () => ({});
    errorFn = jest.fn();

    handleSubmit = createHandleSubmit(
      inputElement,
      outputElement,
      parentElement, // Pass the mock parent element
      globalState,
      processingFunction,
      stopDefault,
      createEnv,
      errorFn,
      addWarningFn,
      mockFetch,
      createElement,
      setTextContent,
      dom
    );
  });

  it('fetches from URL if processingFunction returns a request object', async () => {
    const mockFetchFn = jest.fn(() =>
      Promise.resolve({ text: () => Promise.resolve('fetched content') })
    );

    processingFunction = jest.fn(() =>
      JSON.stringify({ request: { url: 'https://example.com/data' } })
    );

    const handleSubmitWithFetch = createHandleSubmit(
      inputElement,
      outputElement,
      parentElement,
      {},
      processingFunction,
      createEnv,
      errorFn,
      mockFetchFn,
      dom
    );

    await handleSubmitWithFetch(new Event('submit'));

    expect(mockFetchFn).toHaveBeenCalledWith('https://example.com/data');
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(setTextContent).toHaveBeenCalledWith(outputElement, 'fetched content');
  });

  it('handles fetch failure if request URL is unreachable', async () => {
    const mockFetchFn = jest.fn(() =>
      Promise.reject(new Error('Network failure'))
    );

    processingFunction = jest.fn(() =>
      JSON.stringify({ request: { url: 'https://example.com/fail' } })
    );

    const handleSubmitWithFailingFetch = createHandleSubmit(
      inputElement,
      outputElement,
      parentElement,
      {},
      processingFunction,
      createEnv,
      errorFn,
      mockFetchFn,
      dom
    );

    await handleSubmitWithFailingFetch(new Event('submit'));

    await new Promise(resolve => setTimeout(resolve, 0));
    expect(mockFetchFn).toHaveBeenCalledWith('https://example.com/fail');
    expect(errorFn).toHaveBeenCalledWith('Error fetching request URL:', expect.any(Error));
    expect(setTextContent).toHaveBeenCalledWith(outputElement, expect.stringMatching(/Error fetching URL: Network failure/));
    expect(addWarningFn).toHaveBeenCalledWith(outputElement);
  });

  it('handles error thrown by processingFunction', async () => {
    const mockFetchFn = jest.fn(); // Should not be called

    processingFunction = jest.fn(() => {
      throw new Error('processing error');
    });

    const handleSubmitThrowing = createHandleSubmit(
      inputElement,
      outputElement,
      parentElement,
      {},
      processingFunction,
      createEnv,
      errorFn,
      mockFetchFn,
      dom
    );

    await handleSubmitThrowing(new Event('submit'));

    expect(mockFetchFn).not.toHaveBeenCalled();
    expect(errorFn).toHaveBeenCalledWith('Error processing input:', expect.any(Error));
    expect(setTextContent).toHaveBeenCalledWith(outputElement, expect.stringMatching(/Error: processing error/));
    expect(addWarningFn).toHaveBeenCalledWith(outputElement);
  });

  it('handles being called without an event', async () => {
    const stopDefault = jest.fn();
    const createEnv = () => ({});
    const errorFn = jest.fn();
    const addWarningFn = jest.fn();
    const fetchFn = jest.fn();
    const processingFunction = jest.fn(() => 'result from no-event');
    const createElement = jest.fn();

    const input = { value: 'input without event' };
    const output = { textContent: '', parentElement: { classList: { add: jest.fn(), remove: jest.fn() } } };

    const handleSubmitNoEvent = createHandleSubmit(
      input,
      output,
      parentElement,
      {},
      processingFunction,
      createEnv,
      errorFn,
      fetchFn,
      dom
    );

    await handleSubmitNoEvent(); // no event passed

    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(stopDefault).not.toHaveBeenCalled();
    expect(processingFunction).toHaveBeenCalledWith('input without event', expect.any(Object));
    expect(setTextContent).toHaveBeenCalledWith(output, 'result from no-event');
  });
});

describe('initializeInteractiveComponent', () => {
  it('attaches click and keypress listeners with expected arguments', () => {
    const article = {};
    const inputElement = { value: 'test', disabled: false };
    const submitButton = { disabled: false };
    const outputElement = { textContent: '', parentElement: { classList: { remove: jest.fn() } } };

    const querySelector = jest.fn((el, selector) => {
      if (selector === 'input') return inputElement;
      if (selector === 'button') return submitButton;
      if (selector === 'p.output') return outputElement;
      if (selector === 'div.output') return outputElement.parentElement; // Return the parent element when asked for output container
    });

    const globalState = {};
    const createEnvFn = () => ({});
    const errorFn = jest.fn();
    const fetchFn = jest.fn();
    const createElement = jest.fn();
    const setTextContent = jest.fn();
    const stopDefault = jest.fn();
    const addWarning = jest.fn();
    const listeners = {};

    const addEventListener = jest.fn((element, event, handler) => {
      if (element === inputElement && event === 'keypress') {
        listeners.keypress = handler;
      }
      if (element === submitButton && event === 'click') {
        listeners.click = handler;
      }
    });
    const dom = { createElement, setTextContent, stopDefault, addWarning, addEventListener, querySelector };

    const processingFunction = jest.fn(() => 'processed result');

    initializeInteractiveComponent(
      article,
      processingFunction,
      globalState,
      createEnvFn,
      errorFn,
      fetchFn,
      dom
    );

    expect(addEventListener).toHaveBeenCalledTimes(2);
    expect(addEventListener).toHaveBeenCalledWith(submitButton, 'click', expect.any(Function));
    expect(addEventListener).toHaveBeenCalledWith(inputElement, 'keypress', expect.any(Function));

    listeners.keypress({ key: 'Enter', preventDefault: jest.fn() });

    expect(processingFunction).toHaveBeenCalledWith('test', expect.any(Object));
  });

  it('does not call handleSubmit when a non-Enter key is pressed', () => {
    const article = {};
    const inputElement = { value: 'test', disabled: false };
    const submitButton = { disabled: false };
    const outputElement = { textContent: '', parentElement: { classList: { remove: jest.fn() } } };

    const querySelector = jest.fn((el, selector) => {
      if (selector === 'input') return inputElement;
      if (selector === 'button') return submitButton;
      if (selector === 'p.output') return outputElement;
      if (selector === 'div.output') return outputElement.parentElement; // Return the parent element when asked for output container
    });

    const globalState = {};
    const stopDefaultFn = jest.fn();
    const createEnvFn = () => ({});
    const errorFn = jest.fn();
    const addWarningFn = jest.fn();
    const fetchFn = jest.fn();
    const processingFunction = jest.fn(() => 'processed result');
    const listeners = {};
    const createElement = jest.fn();
    const setTextContent = jest.fn();

    const addEventListener = jest.fn((element, event, handler) => {
      if (element === inputElement && event === 'keypress') {
        listeners.keypress = handler;
      }
    });
    const dom = { createElement, setTextContent, stopDefaultFn, addWarningFn, addEventListener, querySelector };

    initializeInteractiveComponent(
      article,
      processingFunction,
      globalState,
      createEnvFn,
      errorFn,
      fetchFn,
      dom
    );

    listeners.keypress({ key: 'a', preventDefault: jest.fn() });

    expect(processingFunction).not.toHaveBeenCalled();
  });
});

describe('initializeVisibleComponents', () => {
  it('warns if there are no interactive components', () => {
    const win = { interactiveComponents: [] };
    const doc = {};
    const logFn = jest.fn();
    const warnFn = jest.fn();
    const getElementByIdFn = jest.fn();
    const createIntersectionObserverFn = jest.fn();

    initializeVisibleComponents(win, doc, logFn, warnFn, getElementByIdFn, createIntersectionObserverFn);

    expect(warnFn).toHaveBeenCalledWith('No interactive components found to initialize');
  });

  it('initializes and observes a valid interactive component', () => {
    const mockArticle = {};
    const mockObserver = { observe: jest.fn() };

    const win = {
      interactiveComponents: [
        { id: 'test-id', modulePath: 'path/to/module', functionName: 'initFunction' }
      ]
    };
    const doc = {};
    const logFn = jest.fn();
    const warnFn = jest.fn();
    const getElementByIdFn = jest.fn(() => mockArticle);
    const createIntersectionObserverFn = jest.fn(() => mockObserver);

    initializeVisibleComponents(win, doc, logFn, warnFn, getElementByIdFn, createIntersectionObserverFn);

    expect(logFn).toHaveBeenCalledWith(
      'Initializing',
      1,
      'interactive components via IntersectionObserver'
    );
    expect(getElementByIdFn).toHaveBeenCalledWith(doc, 'test-id');
    expect(createIntersectionObserverFn).toHaveBeenCalledWith(mockArticle, 'path/to/module', 'initFunction');
    expect(mockObserver.observe).toHaveBeenCalledWith(mockArticle);
  });

  it('warns when article element is missing for a component', () => {
    const win = {
      interactiveComponents: [
        { id: 'missing-id', modulePath: 'path/to/module', functionName: 'initFunction' }
      ]
    };
    const doc = {};
    const logFn = jest.fn();
    const warnFn = jest.fn();
    const getElementByIdFn = jest.fn(() => null);
    const createIntersectionObserverFn = jest.fn();

    initializeVisibleComponents(win, doc, logFn, warnFn, getElementByIdFn, createIntersectionObserverFn);

    expect(getElementByIdFn).toHaveBeenCalledWith(doc, 'missing-id');
    expect(createIntersectionObserverFn).not.toHaveBeenCalled();
    expect(warnFn).toHaveBeenCalledWith(
      'Could not find article element with ID: missing-id for component initialization.'
    );
  });

  it('attempts to initialize all interactive components, regardless of missing fields', () => {
    const win = {
      interactiveComponents: [
        { id: 'a', modulePath: 'valid/path', functionName: '' },
        { id: 'b', modulePath: '', functionName: 'fn' },
        { id: 'c', modulePath: null, functionName: 'fn' },
        { id: 'd', modulePath: 'valid', functionName: 'fn' }
      ]
    };
    const doc = {};
    const logFn = jest.fn();
    const warnFn = jest.fn();
    const getElementByIdFn = jest.fn(() => ({}));
    const createIntersectionObserverFn = jest.fn(() => ({ observe: jest.fn() }));

    initializeVisibleComponents(win, doc, logFn, warnFn, getElementByIdFn, createIntersectionObserverFn);

    expect(createIntersectionObserverFn).toHaveBeenCalledTimes(4);
  });
});

describe('handleModuleError', () => {
  it('calls the error function with the correct message and error object', () => {
    const errorFn = jest.fn();
    const error = new Error('dynamic import failed');
    const handler = handleModuleError('some/module/path.js', errorFn);
    handler(error);
    expect(errorFn).toHaveBeenCalledWith('Error loading module some/module/path.js:', error);
  });
});
