import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { makeObserverCallback, makeCreateIntersectionObserver, enableInteractiveControls, getModuleInitializer } from '../../src/browser/toys.js';

describe('makeObserverCallback', () => {
  let importModule, disconnectObserver, f, modulePath, entry, observer;

  beforeEach(() => {
    importModule = jest.fn();
    disconnectObserver = jest.fn();
    const isIntersecting = jest.fn(() => true);
    const error = jest.fn();
    const dom = {
      removeAllChildren: jest.fn(), importModule, disconnectObserver, isIntersecting, error, contains: () => true };
    const env = {};
    modulePath = 'mod';
    const article = 'art';
    const functionName = 'fn';
    const moduleInfo = { modulePath, article, functionName };
    // Add loggers for moduleConfig compatibility

    f = makeObserverCallback(moduleInfo, env, dom);
    entry = {};
    observer = {};
  });

  it('calls importModule when entry is intersecting', () => {
    // --- WHEN ---
    f([entry], observer);

    // --- THEN ---
    expect(importModule).toHaveBeenCalledWith(
      modulePath,
      expect.any(Function),
      expect.any(Function)
    );
  });

  it('calls disconnectObserver when entry is intersecting', () => {
    // --- WHEN ---
    f([entry], observer);

    // --- THEN ---
    expect(disconnectObserver).toHaveBeenCalledWith(observer);
  });

});

describe('makeCreateIntersectionObserver', () => {
  let entry, observer;
  let expectedResult;
  let dom;
  let f;
  let env;
  let article;
  let modulePath;
  let functionName;
  let g;
  let isIntersecting;

  beforeEach(() => {
    expectedResult = {};
    const makeIntersectionObserver = jest.fn((fn) => {
      g = fn;
      return expectedResult;
    });
    isIntersecting = () => true;
    dom = {
      makeIntersectionObserver,
      importModule: jest.fn(),
      disconnectObserver: jest.fn(),
      error: jest.fn(),
      isIntersecting,
      loggers: { logError: jest.fn() },
    
      contains: () => true
    };
    // Always provide loggers for moduleConfig compatibility


    env = {};
    f = makeCreateIntersectionObserver(dom, env);
    article = {};
    modulePath = 'mod';
    functionName = 'fn';
    entry = {};
    observer = {};
  });

  it('returns the result of makeIntersectionObserver', () => {
    // --- WHEN ---
    const result = f(article, modulePath, functionName);

    // --- THEN ---
    expect(result).toBe(expectedResult);
  });

  it('calls makeIntersectionObserver with a callback', () => {
    // --- WHEN ---
    f(article, modulePath, functionName);

    // --- THEN ---
    expect(dom.makeIntersectionObserver).toHaveBeenCalledWith(expect.any(Function));
  });

  it('calls importModule when entry is intersecting', () => {
    // --- GIVEN ---
    f(article, modulePath, functionName);
    // --- WHEN ---
    g([entry], observer);
    // --- THEN ---
    expect(dom.importModule).toHaveBeenCalled();
  });

  it('calls disconnectObserver when entry is intersecting', () => {
    // --- GIVEN ---
    f(article, modulePath, functionName);
    // --- WHEN ---
    g([entry], observer);
    // --- THEN ---
    expect(dom.disconnectObserver).toHaveBeenCalledWith(observer);
  });

  it('does not call importModule when not intersecting', () => {
    // --- GIVEN ---
    isIntersecting = () => false;
    dom.isIntersecting = isIntersecting;



    const f = makeCreateIntersectionObserver(dom, env);
    f(article, modulePath, functionName);
    // --- WHEN ---
    g([entry], observer);
    // --- THEN ---
    expect(dom.importModule).not.toHaveBeenCalled();
  });

  it('does not call disconnectObserver when not intersecting', () => {
    // --- GIVEN ---
    isIntersecting = () => false;
    dom.isIntersecting = isIntersecting;



    const f = makeCreateIntersectionObserver(dom, env);
    f(article, modulePath, functionName);
    // --- WHEN ---
    g([entry], observer);
    // --- THEN ---
    expect(dom.disconnectObserver).not.toHaveBeenCalled();
  });
});

describe('handleModuleError', () => {
  it('calls errorMock with the correct message', () => {
    // --- GIVEN ---
    const errorMock = jest.fn();
    const modulePath = 'toyModule';
    const handler = handleModuleError(modulePath, errorMock);
    const fakeError = new Error('fail');
    const expectedMessage = 'Error loading module ' + modulePath + ':';

    // --- WHEN ---
    handler(fakeError);

    // --- THEN ---
    expect(errorMock).toHaveBeenCalledWith(
      expectedMessage,
      fakeError
    );
  });
});



describe('enableInteractiveControls', () => {
  let inputElement;
  let submitButton;
  let outputElement;
  let outputParentElement;

  let enable;
  let setTextContent;
  let removeWarning;
  let dom;

  beforeEach(() => {
    // Mock input element
    inputElement = {};

    // Mock submit button
    submitButton = {};

    // Mock parent element with simple classList mock
    outputParentElement = {
      classList: {},
      appendChild: jest.fn() // Not needed, but completes the mock
    };

    // Mock output element and link its parent
    outputElement = {
      textContent: '',
      outputParentElement: outputParentElement
    };

    // Reset enable and setTextContent mocks for each test
    enable = jest.fn();
    setTextContent = jest.fn();
    removeWarning = jest.fn();
    dom = { setTextContent, removeWarning, enable, contains: () => true };
    dom.removeAllChildren = jest.fn();
    dom.createElement = jest.fn(() => ({}));
    dom.appendChild = jest.fn();
  });

  it('enables input and submit button', () => {
    // --- WHEN ---
    enableInteractiveControls({ inputElement, submitButton, parent: outputParentElement }, dom);

    // --- THEN ---
    expect(enable).toHaveBeenCalledWith(inputElement);
    expect(enable).toHaveBeenCalledWith(submitButton);
  });

  it('sets output textContent to "Ready for input" using parent branch', () => {
    // --- GIVEN ---
    const expectedText = 'Ready for input';
    const parent = {};
    const removeChild = jest.fn();
    const appendChild = jest.fn();
    dom.removeChild = removeChild;
    dom.appendChild = appendChild;
    dom.removeAllChildren = jest.fn();
    dom.createElement = jest.fn(() => ({}));
    const paragraph = {};
    dom.createElement = jest.fn(() => paragraph);
    // --- WHEN ---
    enableInteractiveControls({ inputElement, submitButton, parent }, dom);
    // --- THEN ---
    expect(dom.removeAllChildren).toHaveBeenCalledWith(parent);
    expect(appendChild).toHaveBeenCalledWith(parent, paragraph);
    expect(setTextContent).toHaveBeenCalledWith(paragraph, expectedText);
  });

  it('removes "warning" class from parent element', () => {
    // --- WHEN ---
    enableInteractiveControls({ inputElement, submitButton, parent: outputParentElement }, dom);
    // --- THEN ---
    expect(removeWarning).toHaveBeenCalledWith(outputParentElement);
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
    const paragraph = {};
    const outputParentElement = {};
    const outputElement = { textContent: '', outputParentElement };
    const dom = {
      removeAllChildren: jest.fn(),
      querySelector: (el, selector) => {
        if (selector === 'input' || selector === 'button') {return {};}
        if (selector === 'div.output > p') {return outputElement;}
        if (selector === 'div.output') {return outputElement.outputParentElement;}
        return {};
      },
      addEventListener: jest.fn(),
      setTextContent: jest.fn(),
      removeAllChildren: jest.fn(),
      removeWarning: jest.fn(),
      enable: jest.fn(),
      removeChild: jest.fn(),
      appendChild: jest.fn(),
      createElement: jest.fn(() => paragraph),
      contains: () => true,
      removeAllChildren: jest.fn()
    };

    // Pass globalState, createEnv, error, and fetch directly
    // Create config object as passed to initializeAndRenderComponent
    const config = {
      globalState,
      createEnvFn: createEnv,
      errorFn: error,
      fetchFn: fetch,
      dom
    };
    // Use getModuleInitializer to create an initializer and invoke with a module
    const result = getModuleInitializer(article, functionName, config);
    const module = { [functionName]: jest.fn() };
    const response = result(module);
    // Expectations at end
    expect(response).toBeUndefined();
    expect(dom.removeAllChildren).toHaveBeenCalledWith(outputParentElement);
    expect(dom.createElement).toHaveBeenCalledWith('p');
    expect(dom.appendChild).toHaveBeenCalledWith(outputParentElement, paragraph);
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
      removeAllChildren: jest.fn(),
      removeChild: jest.fn(),
      appendChild: jest.fn(),
      contains: () => true,
      removeAllChildren: jest.fn()
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
    expect(dom.addWarning).toHaveBeenCalledWith(outputParentElement);
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
    const paragraph = {};
    const outputParentElement = { classList: { add: jest.fn(), remove: jest.fn() } };
    const output = { textContent: '', outputParentElement };
    const dom = {
      createElement: jest.fn(() => paragraph),
      stopDefault: jest.fn(),
      addWarning: jest.fn(),
      removeChild: jest.fn(),
      appendChild: jest.fn(),
      setTextContent: jest.fn(),
      contains: () => true,
      removeAllChildren: jest.fn()
    };

    const env = { globalState: {}, createEnv, errorFn, fetchFn, dom };
    const handleSubmitNoEvent = createHandleSubmit(
      { inputElement: input, outputElement: output, outputParentElement },
      processingFunction,
      env
    );

    await handleSubmitNoEvent(); // no event passed
    await new Promise(resolve => setTimeout(resolve, 0));
    // Expectations at end
    expect(stopDefault).not.toHaveBeenCalled();
    expect(processingFunction).toHaveBeenCalledWith('input without event', expect.any(Object));
    expect(dom.removeAllChildren).toHaveBeenCalledWith(outputParentElement);
    expect(dom.createElement).toHaveBeenCalledWith('p');
    expect(dom.appendChild).toHaveBeenCalledWith(outputParentElement, paragraph);
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
      if (selector === 'input') {return inputElement;}
      if (selector === 'button') {return submitButton;}
      if (selector === 'div.output > p') {return outputElement;}
      if (selector === 'div.output') {return outputElement.outputParentElement;} // Return the parent element when asked for output container
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
      removeAllChildren: jest.fn(),
      createElement,
      stopDefault,
      addWarning,
      addWarningFn: addWarning,
      addEventListener,
      removeChild: jest.fn(),
      appendChild: jest.fn(),
      querySelector,
      setTextContent: jest.fn((el, text) => { el.textContent = text; }),
      removeAllChildren: jest.fn(),
      removeWarning: jest.fn(),
      enable: jest.fn(),
      contains: () => true,
      removeAllChildren: jest.fn()
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
      outputParentElement: { classList: { remove: jest.fn() } }
    };

    const querySelector = jest.fn((el, selector) => {
      if (selector === 'input') {return inputElement;}
      if (selector === 'button') {return submitButton;}
      if (selector === 'div.output > p') {return outputElement;}
      if (selector === 'div.output') {return outputElement.outputParentElement;} // Return the parent element when asked for output container
    });

    const globalState = {};
    const stopDefaultFn = jest.fn();
    const listeners2 = {};
    const addEventListener = jest.fn((element, event, handler) => {
      if (element === inputElement && event === 'keypress') {
        listeners2.keypress = handler;
      }
      if (element === submitButton && event === 'click') {
        listeners2.click = handler;
      }
    });
    const dom = {
      removeAllChildren: jest.fn(),
      querySelector,
      addEventListener,
      setTextContent: jest.fn(),
      removeAllChildren: jest.fn(),
      removeWarning: jest.fn(),
      enable: jest.fn(),
      removeChild: jest.fn(),
      appendChild: jest.fn(),
      createElement: jest.fn(() => ({})),
      contains: () => true,
      removeAllChildren: jest.fn()
    };
    const createEnvFn = () => ({});
    const errorFn = jest.fn();
    const fetchFn = jest.fn();
    const processingFunction = jest.fn(() => 'processed result');
    const listeners = {};
    const createElement = jest.fn().mockImplementation(() => ({ textContent: '' }));



    const config = { globalState, createEnvFn, errorFn, fetchFn, dom };
    initializeInteractiveComponent(
      article,
      processingFunction,
      config
    );

    listeners2.keypress({ key: 'a', preventDefault: jest.fn() });
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
