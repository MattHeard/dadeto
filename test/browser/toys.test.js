import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { handleIntersectionEntries, makeObserverCallback, makeCreateIntersectionObserver, initialiseModule, enableInteractiveControls } from '../../src/browser/toys.js';

describe('function coverage: direct invocation', () => {
  it('makeObserverCallback returns a function', () => {
    handleIntersectionEntries([], {}, '', '', '', {}, {});
    const cb = makeObserverCallback('mod', 'art', 'fn', {}, {});
    // Expectation: cb is a function
    expect(typeof cb).toBe('function');
  });

  it('makeCreateIntersectionObserver returns a function', () => {
    handleIntersectionEntries([], {}, '', '', '', {}, {});
    const dom = {
      makeIntersectionObserver: (cb) => {
        callbackArgs = cb;
        return 'observer-instance';
      },
      importModule: jest.fn(),
      disconnectObserver: jest.fn(),
      error: jest.fn(),
      isIntersecting: (entry) => entry.isIntersecting
    };
    const env = {};
    const createObs = makeCreateIntersectionObserver(dom, env);
    // Expectation: createObs is a function
    expect(typeof createObs).toBe('function');
  });

  it('covers the intersection observer callback chain', () => {
    let observerCallback;
    const dom = {
      makeIntersectionObserver: (cb) => {
        observerCallback = cb;
        return 'observer-instance';
      },
      importModule: jest.fn(),
      disconnectObserver: jest.fn(),
      error: jest.fn(),
      isIntersecting: (entry) => entry.isIntersecting
    };
    const env = {};
    const article = {};
    const modulePath = 'mod';
    const functionName = 'fn';
    const createObs = makeCreateIntersectionObserver(dom, env);
    const observerInstance = createObs(article, modulePath, functionName);
    // Simulate the intersection observer callback with an intersecting entry
    const entry = { isIntersecting: true };
    const observer = {};
    observerCallback([entry], observer);
    // Expectations at end
    expect(observerInstance).toBe('observer-instance');
    expect(dom.importModule).toHaveBeenCalled();
    expect(dom.disconnectObserver).toHaveBeenCalledWith(observer);
  });

  it('does not call importModule or disconnectObserver when not intersecting', () => {
    let observerCallback;
    const dom = {
      makeIntersectionObserver: (cb) => {
        observerCallback = cb;
        return 'observer-instance';
      },
      importModule: jest.fn(),
      disconnectObserver: jest.fn(),
      error: jest.fn(),
      isIntersecting: () => false
    };
    const env = {};
    const article = {};
    const modulePath = 'mod';
    const functionName = 'fn';
    const createObs = makeCreateIntersectionObserver(dom, env);
    createObs(article, modulePath, functionName);
    // Simulate the intersection observer callback with a non-intersecting entry
    const entry = { isIntersecting: false };
    const observer = {};
    observerCallback([entry], observer);
    // Expectations at end
    expect(dom.importModule).not.toHaveBeenCalled();
    expect(dom.disconnectObserver).not.toHaveBeenCalled();
  });
});

it('covers handleModuleError error handler', () => {
  const errorMock = jest.fn();
  const modulePath = 'toyModule';
  const handler = handleModuleError(modulePath, errorMock);
  const fakeError = new Error('fail');
  handler(fakeError);
  // Expectations at end
  expect(errorMock).toHaveBeenCalledWith(
    'Error loading module ' + modulePath + ':',
    fakeError
  );
});

describe('enableInteractiveControls', () => {
  let inputElement;
  let submitButton;
  let outputElement;
  let outputParentElement;
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
    outputParentElement = { 
      classList: mockParentClassList,
      appendChild: jest.fn() // Not needed, but completes the mock
    };

    // Mock output element and link its parent
    outputElement = { 
      textContent: '',
      outputParentElement: outputParentElement
    };
    
  });

  it('enables input and submit button', () => {
    const dom = { setTextContent: jest.fn(), removeWarning: jest.fn() };
    enableInteractiveControls(inputElement, submitButton, outputElement, dom);
    // Expectations at end
    expect(inputElement.disabled).toBe(false);
    expect(submitButton.disabled).toBe(false);
  });

  it('sets output textContent to "Ready for input"', () => {
    const dom = { setTextContent: (el, text) => { el.textContent = text; }, removeWarning: jest.fn() };
    enableInteractiveControls(inputElement, submitButton, outputElement, dom);
    // Expectations at end
    expect(outputElement.textContent).toBe('Ready for input');
  });

  it('removes "warning" class from parent element', () => {
    const dom = { setTextContent: (el, text) => { el.textContent = text; }, removeWarning: jest.fn() };
    enableInteractiveControls(inputElement, submitButton, outputElement, dom);
    // Expectations at end
    expect(dom.removeWarning).toHaveBeenCalledWith(outputElement);
  });
});

describe('initialiseModule', () => {
  it('can be invoked with minimal arguments', () => {
    const article = {};
    const functionName = 'process';
    const globalState = {};
    const createEnv = () => ({});
    const error = () => {};
    const fetch = () => {};
    const mockClassList = { remove: jest.fn() };
    const outputParentElement = { classList: mockClassList, textContent: '' };
    const outputElement = { textContent: '', outputParentElement };
    const dom = {
      querySelector: (el, selector) => {
        if (selector === 'input' || selector === 'button') return {};
        if (selector === 'p.output') return outputElement;
        if (selector === 'div.output') return outputElement.outputParentElement;
        return {};
      },
      addEventListener: jest.fn(),
      setTextContent: jest.fn(),
      removeWarning: jest.fn()
    };

    const env = {
      globalState,
      createEnv,
      error,
      fetch
    };
    const result = initialiseModule(article, functionName, env, dom);
    const module = { process: () => 'ok' };
    const response = result(module);
    // Expectations at end
    expect(response).toBeUndefined();
    expect(dom.setTextContent).toHaveBeenCalledWith(outputElement, 'Initialising...');
  });
});

import { getDeepStateCopy } from '../../src/browser/toys.js';

describe('getDeepStateCopy', () => {
  it('returns a deep copy of the global state object', () => {
    const globalState = {
      level1: {
        level2: {
          value: 'original'
        }
      }
    };

    const copy = getDeepStateCopy(globalState);

    // Expectations at end
    expect(copy).toEqual(globalState);
    expect(copy).not.toBe(globalState);
    expect(copy.level1).not.toBe(globalState.level1);
    expect(copy.level1.level2).not.toBe(globalState.level1.level2);

    // Modify copy to ensure it's a deep copy
    copy.level1.level2.value = 'modified';
    expect(globalState.level1.level2.value).toBe('original');
  });
});

import { createHandleSubmit, initializeInteractiveComponent, initializeVisibleComponents, handleModuleError } from '../../src/browser/toys.js';

describe('createHandleSubmit', () => {
  let fetchFn;
  let inputElement;
  let outputElement;
  let processingFunction;
  let outputParentElement;
  let elements;

  let dom;
  let newParagraph;

  beforeEach(() => {
    inputElement = {};
    outputElement = {};
    outputParentElement = {};
    newParagraph = {};
    dom = {
      createElement: jest.fn().mockImplementation(() => newParagraph),
      stopDefault: jest.fn(),
      addWarning: jest.fn(),
      setTextContent: jest.fn(),
      removeChild: jest.fn(),
      appendChild: jest.fn()
    };
    fetchFn = jest.fn();

    processingFunction = jest.fn(async () => 'transformed');

    elements = { inputElement, outputElement, outputParentElement };
  });

  it('fetches from URL if processingFunction returns a request object', async () => {
    const fetchedContent = 'fetched content';
    fetchFn = jest.fn(() =>
      Promise.resolve({ text: () => Promise.resolve(fetchedContent) })
    );

    const url = 'https://example.com/data';
    const request = { request: { url } };
    processingFunction = jest.fn(() => JSON.stringify(request));

    const globalState = {};
    const createEnv = () => ({});
    const errorFn = jest.fn();
    // fetchFn and dom are already defined above
    const env = { globalState, createEnv, errorFn, fetchFn, dom };

    const handleSubmitWithFetch = createHandleSubmit(elements, processingFunction, env);

    await handleSubmitWithFetch(new Event('submit'));
    await new Promise(resolve => setTimeout(resolve, 0));
    // Expectations at end
    expect(dom.setTextContent).toHaveBeenCalledWith(outputElement, fetchedContent);
  });

  it('handles fetch failure if request URL is unreachable', async () => {
    fetchFn = jest.fn(() =>
      Promise.reject(new Error('Network failure'))
    );

    const url = 'https://example.com/fail';
    const request = { request: { url } };
    processingFunction = jest.fn(() => JSON.stringify(request));

    const globalState = {};
    const createEnv = () => ({});
    const errorFn = jest.fn();
    const env = { globalState, createEnv, errorFn, fetchFn, dom };

    const handleSubmitWithFailingFetch = createHandleSubmit(elements, processingFunction, env);

    await handleSubmitWithFailingFetch(new Event('submit'));
    await new Promise(resolve => setTimeout(resolve, 0));
    // Expectations at end
    expect(dom.setTextContent).toHaveBeenCalledWith(outputElement, expect.stringMatching(/Error fetching URL: Network failure/));
    expect(dom.addWarning).toHaveBeenCalledWith(outputElement);
  });

  it('handles error thrown by processingFunction', async () => {
    processingFunction = jest.fn(() => {
      throw new Error('processing error');
    });


    const env = {
      globalState: {},
      createEnv: () => ({}),
      errorFn: jest.fn(),
      fetchFn: fetchFn,
      dom
    };
    const handleSubmitThrowing = createHandleSubmit(
      elements,
      processingFunction,
      env
    );

    await handleSubmitThrowing(new Event('submit'));
    // Expectations at end
    expect(fetchFn).not.toHaveBeenCalled();
    expect(dom.setTextContent).toHaveBeenCalledWith(newParagraph, expect.stringMatching(/Error: processing error/));
    expect(dom.addWarning).toHaveBeenCalledWith(outputParentElement);
  });

  it('handles being called without an event', async () => {
    const stopDefault = jest.fn();
    const createEnv = () => ({});
    const errorFn = jest.fn();
    const processingFunction = jest.fn(() => 'result from no-event');

    const input = { value: 'input without event' };
    const output = { textContent: '', outputParentElement: { classList: { add: jest.fn(), remove: jest.fn() } } };

    const env = { globalState: {}, createEnv, errorFn, fetchFn, dom };
    const handleSubmitNoEvent = createHandleSubmit(
      { inputElement: input, outputElement: output },
      processingFunction,
      env
    );

    await handleSubmitNoEvent(); // no event passed
    await new Promise(resolve => setTimeout(resolve, 0));
    // Expectations at end
    expect(stopDefault).not.toHaveBeenCalled();
    expect(processingFunction).toHaveBeenCalledWith('input without event', expect.any(Object));
    expect(dom.setTextContent).toHaveBeenCalledWith(output, 'result from no-event');
  });
});

describe('initializeInteractiveComponent', () => {
  it('attaches click and keypress listeners with expected arguments', () => {
    const article = {};
    const inputElement = { value: 'test', disabled: false };
    const submitButton = { disabled: false };
    const outputElement = {
      textContent: '',
      outputParentElement: { classList: { remove: jest.fn() }, removeChild: jest.fn(), appendChild: jest.fn() }
    };

    const querySelector = jest.fn((el, selector) => {
      if (selector === 'input') return inputElement;
      if (selector === 'button') return submitButton;
      if (selector === 'p.output') return outputElement;
      if (selector === 'div.output') return outputElement.outputParentElement; // Return the parent element when asked for output container
    });

    const globalState = {};
    const createEnvFn = () => ({});
    const errorFn = jest.fn();
    const fetchFn = jest.fn();
    const createElement = jest.fn().mockImplementation(() => ({ textContent: '' }));
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
    const dom = {
      createElement,
      stopDefault,
      addWarning,
      addWarningFn: addWarning,
      addEventListener,
      removeChild: jest.fn(),
      appendChild: jest.fn(),
      querySelector,
      setTextContent: jest.fn((el, text) => { el.textContent = text; }),
      removeWarning: jest.fn()
    };

    const processingFunction = jest.fn(() => 'processed result');

    const config = { globalState, createEnvFn, errorFn, fetchFn, dom };
    initializeInteractiveComponent(
      article,
      processingFunction,
      config
    );

    listeners.keypress({ key: 'Enter', preventDefault: jest.fn() });
    // Expectations at end
    expect(addEventListener).toHaveBeenCalledTimes(2);
    expect(addEventListener).toHaveBeenCalledWith(submitButton, 'click', expect.any(Function));
    expect(addEventListener).toHaveBeenCalledWith(inputElement, 'keypress', expect.any(Function));
    expect(processingFunction).toHaveBeenCalledWith('test', expect.any(Object));
  });

  it('does not call handleSubmit when a non-Enter key is pressed', () => {
    const article = {};
    const inputElement = { value: 'test', disabled: false };
    const submitButton = { disabled: false };
    const outputElement = {
      textContent: '',
      outputParentElement: { classList: { remove: jest.fn() }, removeChild: jest.fn(), appendChild: jest.fn() }
    };

    const querySelector = jest.fn((el, selector) => {
      if (selector === 'input') return inputElement;
      if (selector === 'button') return submitButton;
      if (selector === 'p.output') return outputElement;
      if (selector === 'div.output') return outputElement.outputParentElement; // Return the parent element when asked for output container
    });

    const globalState = {};
    const stopDefaultFn = jest.fn();
    const createEnvFn = () => ({});
    const errorFn = jest.fn();
    const fetchFn = jest.fn();
    const processingFunction = jest.fn(() => 'processed result');
    const listeners = {};
    const createElement = jest.fn().mockImplementation(() => ({ textContent: '' }));

    const addEventListener = jest.fn((element, event, handler) => {
      if (element === inputElement && event === 'keypress') {
        listeners.keypress = handler;
      }
    });
    const dom = {
      createElement,
      setTextContent: jest.fn((el, text) => { el.textContent = text; }),
      stopDefault: stopDefaultFn,
      addWarning: jest.fn(),
      addEventListener,
      querySelector,
      removeWarning: jest.fn()
    };

    const config = { globalState, createEnvFn, errorFn, fetchFn, dom };
    initializeInteractiveComponent(
      article,
      processingFunction,
      config
    );

    listeners.keypress({ key: 'a', preventDefault: jest.fn() });
    // Expectations at end
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
    // Expectations at end
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
    // Expectations at end
    expect(logFn).toHaveBeenCalledWith(
      'Initializing',
      1,
      'interactive components via IntersectionObserver'
    );
    expect(getElementByIdFn).toHaveBeenCalledWith('test-id');
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
    // Expectations at end
    expect(getElementByIdFn).toHaveBeenCalledWith('missing-id');
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
    // Expectations at end
    expect(createIntersectionObserverFn).toHaveBeenCalledTimes(4);
  });
});
