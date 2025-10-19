import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  makeObserverCallback,
  makeCreateIntersectionObserver,
  enableInteractiveControls,
  getModuleInitializer,
  initializeVisibleComponents,
  initializeInteractiveComponent,
  handleModuleError,
  handleDropdownChange,
  createAddDropdownListener,
  createInputDropdownHandler,
  getText,
} from '../../src/browser/toys.js';

describe('createAddDropdownListener', () => {
  it('adds a change event listener to the dropdown', () => {
    // Arrange
    const mockOnChange = jest.fn();
    const mockAddEventListener = jest.fn();
    const mockDom = {
      addEventListener: mockAddEventListener,
    };
    const mockDropdown = {};

    // Act
    const addListener = createAddDropdownListener(mockOnChange, mockDom);
    expect(typeof addListener).toBe('function');
    addListener(mockDropdown);

    // Assert
    expect(mockAddEventListener).toHaveBeenCalledTimes(1);
    expect(mockAddEventListener).toHaveBeenCalledWith(
      mockDropdown,
      'change',
      mockOnChange
    );
  });

  it('returns a listener function', () => {
    const addListener = createAddDropdownListener(jest.fn(), {
      addEventListener: jest.fn(),
    });

    expect(typeof addListener).toBe('function');
  });

  it('invokes the attached handler and returns undefined', () => {
    const mockOnChange = jest.fn();
    const mockDom = {
      addEventListener: jest.fn(),
    };
    const addListener = createAddDropdownListener(mockOnChange, mockDom);
    const result = addListener({});

    expect(result).toBeUndefined();
    expect(mockDom.addEventListener).toHaveBeenCalled();
  });
});

describe('toys', () => {
  describe('handleDropdownChange', () => {
    it('logs the correct postId and selectedValue when dropdown changes', () => {
      // Mock dropdown and article
      const mockArticle = { id: 'post-123' };
      // Mock parent node with DOM methods
      const mockParent = {
        appendChild: jest.fn(),
        removeChild: jest.fn(),
        firstChild: null,
      };
      const mockDropdown = {
        value: 'text',
        parentNode: {
          querySelector: () => mockParent,
        },
        closest: jest.fn(() => mockArticle),
      };
      const mockGetData = jest.fn(() => ({
        output: { 'post-123': 'mockOutput' },
      }));

      const dom = {
        querySelector: (el, selector) => el.querySelector(selector),
        removeAllChildren: node => {
          while (node.firstChild) {
            node.removeChild(node.firstChild);
          }
        },
        appendChild: (parent, child) => parent.appendChild(child),
        createElement: () => ({}),
        setTextContent: (el, txt) => {
          el.textContent = txt;
        },
      };
      handleDropdownChange(mockDropdown, mockGetData, dom);
    });

    it('gets the enclosing article using the correct selector', () => {
      const mockArticle = { id: 'article-1' };
      const dropdown = {
        value: 'text',
        parentNode: { querySelector: () => ({}) },
        closest: jest.fn(() => mockArticle),
      };
      const getData = jest.fn(() => ({ output: {} }));
      const dom = {
        querySelector: jest.fn(() => ({})),
        setTextContent: jest.fn(),
        removeAllChildren: jest.fn(),
        appendChild: jest.fn(),
        createElement: jest.fn(() => ({})),
      };

      handleDropdownChange(dropdown, getData, dom);

      expect(dropdown.closest).toHaveBeenCalledWith('article.entry');
    });

    it('does not throw when output object is missing', () => {
      const parent = { child: null, querySelector: jest.fn(() => parent) };
      const dropdown = {
        value: 'text',
        closest: jest.fn(() => ({ id: 'post-missing' })),
        parentNode: parent,
      };
      const dom = {
        querySelector: jest.fn((el, selector) => el.querySelector(selector)),
        removeAllChildren: jest.fn(p => {
          p.child = null;
        }),
        appendChild: jest.fn((p, c) => {
          p.child = c;
        }),
        createElement: jest.fn(() => ({ textContent: '' })),
        setTextContent: jest.fn((el, txt) => {
          el.textContent = txt;
        }),
      };
      const getData = jest.fn(() => ({}));

      expect(() => handleDropdownChange(dropdown, getData, dom)).not.toThrow();
      expect(parent.child.textContent).toBe('');
    });

    it('handles dropdown change with empty output data', () => {
      // Mock dropdown with required methods
      const dropdown = {
        value: 'text', // 'text' is a valid key in presentersMap
        closest: jest.fn(() => ({ id: 'test-article' })), // Mock closest to return an article
        parentNode: {
          querySelector: jest.fn(() => ({})), // Mock parentNode.querySelector
        },
      };

      // Mock getData to return empty output
      const getData = jest.fn(() => ({ output: {} }));

      // Create a mock parent element and mock element to be appended
      const mockParent = {};
      const mockElement = {};

      // Mock DOM utilities
      const dom = {
        querySelector: jest.fn(() => mockParent),
        setTextContent: jest.fn(),
        removeAllChildren: jest.fn(),
        appendChild: jest.fn(),
        createElement: jest.fn(() => mockElement),
      };

      handleDropdownChange(dropdown, getData, dom);

      // Verify the output container was found
      expect(dom.querySelector).toHaveBeenCalledWith(
        dropdown.parentNode,
        'div.output'
      );

      // Verify the parent was cleared
      expect(dom.removeAllChildren).toHaveBeenCalledWith(mockParent);

      // Verify a new element was created and appended
      expect(dom.createElement).toHaveBeenCalled();
      expect(dom.appendChild).toHaveBeenCalledWith(mockParent, mockElement);
    });

    it('sets the output text when output exists for the post', () => {
      const parent = { child: null, querySelector: jest.fn() };
      parent.querySelector.mockReturnValue(parent);
      const dropdown = {
        value: 'text',
        closest: jest.fn(() => ({ id: 'post-1' })),
        parentNode: parent,
      };
      const getData = jest.fn(() => ({ output: { 'post-1': 'stored' } }));
      const dom = {
        querySelector: (el, selector) => el.querySelector(selector),
        removeAllChildren: jest.fn(p => {
          p.child = null;
        }),
        appendChild: jest.fn((p, c) => {
          p.child = c;
        }),
        createElement: jest.fn(() => ({ textContent: '' })),
        setTextContent: jest.fn((el, txt) => {
          el.textContent = txt;
        }),
      };

      handleDropdownChange(dropdown, getData, dom);

      expect(parent.child.textContent).toBe('stored');
    });

    it('defaults to empty text when no output exists for the post', () => {
      const parent = { child: null, querySelector: jest.fn() };
      parent.querySelector.mockReturnValue(parent);
      const dropdown = {
        value: 'text',
        closest: jest.fn(() => ({ id: 'post-2' })),
        parentNode: parent,
      };
      const getData = jest.fn(() => ({ output: {} }));
      const dom = {
        querySelector: (el, selector) => el.querySelector(selector),
        removeAllChildren: jest.fn(p => {
          p.child = null;
        }),
        appendChild: jest.fn((p, c) => {
          p.child = c;
        }),
        createElement: jest.fn(() => ({ textContent: '' })),
        setTextContent: jest.fn((el, txt) => {
          el.textContent = txt;
        }),
      };

      handleDropdownChange(dropdown, getData, dom);

      expect(parent.child.textContent).toBe('');
    });

    it('defaults to empty text when output is undefined', () => {
      const parent = { child: null, querySelector: jest.fn() };
      parent.querySelector.mockReturnValue(parent);
      const dropdown = {
        value: 'text',
        closest: jest.fn(() => ({ id: 'post-undef' })),
        parentNode: parent,
      };
      const getData = jest.fn(() => ({}));
      const dom = {
        querySelector: (el, selector) => el.querySelector(selector),
        removeAllChildren: jest.fn(p => {
          p.child = null;
        }),
        appendChild: jest.fn((p, c) => {
          p.child = c;
        }),
        createElement: jest.fn(() => ({ textContent: '' })),
        setTextContent: jest.fn((el, txt) => {
          el.textContent = txt;
        }),
      };

      expect(() => handleDropdownChange(dropdown, getData, dom)).not.toThrow();
      expect(parent.child.textContent).toBe('');
    });

    it('uses the closest article id to look up and display output', () => {
      const parent = { child: null, querySelector: jest.fn() };
      parent.querySelector.mockReturnValue(parent);
      const dropdown = {
        value: 'text',
        closest: jest.fn(() => ({ id: 'post-42' })),
        parentNode: parent,
      };
      const getData = jest.fn(() => ({ output: { 'post-42': 'answer' } }));
      const dom = {
        querySelector: (el, selector) => el.querySelector(selector),
        removeAllChildren: jest.fn(p => {
          p.child = null;
        }),
        appendChild: jest.fn((p, c) => {
          p.child = c;
        }),
        createElement: jest.fn(() => ({ textContent: '' })),
        setTextContent: jest.fn((el, txt) => {
          el.textContent = txt;
        }),
      };

      handleDropdownChange(dropdown, getData, dom);

      expect(dropdown.closest).toHaveBeenCalledWith('article.entry');
      expect(parent.child.textContent).toBe('answer');
    });

    it('creates empty output when data.output is missing', () => {
      const parent = { child: null, querySelector: jest.fn(() => parent) };
      const dropdown = {
        value: 'text',
        closest: jest.fn(() => ({ id: 'post-missing' })),
        parentNode: parent,
      };
      const getData = jest.fn(() => ({}));
      const dom = {
        querySelector: (el, selector) => el.querySelector(selector),
        removeAllChildren: jest.fn(p => {
          p.child = null;
        }),
        appendChild: jest.fn((p, c) => {
          p.child = c;
        }),
        createElement: jest.fn(() => ({ textContent: '' })),
        setTextContent: jest.fn((el, txt) => {
          el.textContent = txt;
        }),
      };

      expect(() => handleDropdownChange(dropdown, getData, dom)).not.toThrow();
      expect(dom.removeAllChildren).toHaveBeenCalledWith(parent);
      expect(dom.appendChild).toHaveBeenCalledWith(parent, expect.any(Object));
      expect(dom.setTextContent).toHaveBeenCalledWith(expect.any(Object), '');
      expect(parent.child.textContent).toBe('');
    });

    it('uses the pre presenter when dropdown value is "pre"', () => {
      const parent = { child: null, querySelector: jest.fn(() => parent) };
      const dropdown = {
        value: 'pre',
        closest: jest.fn(() => ({ id: 'post-pre' })),
        parentNode: parent,
      };
      const getData = jest.fn(() => ({ output: { 'post-pre': 'hello' } }));
      const dom = {
        querySelector: (el, selector) => el.querySelector(selector),
        removeAllChildren: jest.fn(p => {
          p.child = null;
        }),
        appendChild: jest.fn((p, c) => {
          p.child = c;
        }),
        createElement: jest.fn(tag => ({
          tagName: tag.toUpperCase(),
          textContent: '',
        })),
        setTextContent: jest.fn((el, txt) => {
          el.textContent = txt;
        }),
      };

      handleDropdownChange(dropdown, getData, dom);

      expect(dom.createElement).toHaveBeenCalledWith('pre');
      expect(parent.child.tagName).toBe('PRE');
      expect(parent.child.textContent).toBe('hello');
    });
  });

  let entry;
  let observer;
  let modulePath;
  let article;

  beforeEach(() => {
    modulePath = 'mod';
    article = {};
  });

  // --- Existing tests below ---
  describe('makeObserverCallback', () => {
    let observerCallback;
    let importModule;
    let disconnectObserver;

    beforeEach(() => {
      importModule = jest.fn();
      disconnectObserver = jest.fn();
      const isIntersecting = jest.fn(() => true);
      const error = jest.fn();
      const removeAllChildren = jest.fn();
      const contains = () => true;
      const dom = {
        removeAllChildren,
        importModule,
        disconnectObserver,
        isIntersecting,
        error,
        contains,
      };
      const logError = jest.fn();
      const loggers = { logError };
      const env = { loggers };
      const article = 'art';
      const functionName = 'fn';
      const moduleInfo = { modulePath, article, functionName };
      // Add loggers for moduleConfig compatibility
      observerCallback = makeObserverCallback(moduleInfo, env, dom);
      observer = {};
    });

    it('calls importModule when entry is intersecting', () => {
      // --- WHEN ---
      observerCallback([entry], observer);
      // --- THEN ---
      expect(importModule).toHaveBeenCalledWith(
        modulePath,
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('calls disconnectObserver when entry is intersecting', () => {
      // --- WHEN ---
      observerCallback([entry], observer);
      // --- THEN ---
      expect(disconnectObserver).toHaveBeenCalledWith(observer);
    });
  });

  describe('makeCreateIntersectionObserver', () => {
    let createObserver;
    let expectedResult;
    let dom;
    let env;
    let functionName;
    let intersectionCallback;
    let isIntersecting;
    let inputElement;
    let submitButton;

    beforeEach(() => {
      expectedResult = {};
      const makeIntersectionObserver = jest.fn(fn => {
        intersectionCallback = fn;
        return expectedResult;
      });
      isIntersecting = () => true;
      inputElement = { disabled: false };
      submitButton = { disabled: false };
      const outputParent = {};
      const outputSelect = {};
      const selectorMap = new Map([
        ['input[type="text"]', inputElement],
        ['button[type="submit"]', submitButton],
        ['div.output', outputParent],
        ['select.output', outputSelect],
      ]);
      const querySelector = jest.fn((el, selector) =>
        selectorMap.get(selector)
      );
      const listeners = {};
      const addEventListener = jest.fn((el, event, handler) => {
        listeners[event] = handler;
      });
      dom = {
        makeIntersectionObserver,
        importModule: jest.fn(),
        disconnectObserver: jest.fn(),
        error: jest.fn(),
        isIntersecting,
        contains: () => true,
        querySelector,
        addEventListener,
        removeAllChildren: jest.fn(),
        createElement: jest.fn(() => ({})),
        setTextContent: jest.fn(() => ({})),
        appendChild: jest.fn(),
        removeChild: jest.fn(),
        enable: jest.fn(),
        removeWarning: jest.fn(),
        addWarning: jest.fn(),
        stopDefault: jest.fn(),
        listeners,
        inputElement,
        submitButton,
      };
      // Always provide loggers for moduleConfig compatibility
      env = {
        loggers: { logError: jest.fn(), logInfo: jest.fn() },
        error: jest.fn(),
        fetch: jest.fn(),
        globalState: {},
        createEnv: jest.fn(),
      };
      createObserver = makeCreateIntersectionObserver(dom, env);
      functionName = 'fn';
      entry = {};
      observer = {};
    });

    it('returns the result of makeIntersectionObserver', () => {
      // --- WHEN ---
      const result = createObserver(article, modulePath, functionName);
      // --- THEN ---
      expect(result).toBe(expectedResult);
    });

    it('calls makeIntersectionObserver with a callback', () => {
      // --- WHEN ---
      createObserver(article, modulePath, functionName);
      // --- THEN ---
      expect(dom.makeIntersectionObserver).toHaveBeenCalledWith(
        expect.any(Function)
      );
    });

    it('calls importModule when entry is intersecting', () => {
      // --- GIVEN ---
      createObserver(article, modulePath, functionName);
      // --- WHEN ---
      intersectionCallback([entry], observer);
      // --- THEN ---
      expect(dom.importModule).toHaveBeenCalled();
    });

    // Regression test for a Stryker survivor that removed module info
    it('passes module info to importModule when entry is intersecting', () => {
      // --- GIVEN ---
      createObserver(article, modulePath, functionName);
      // --- WHEN ---
      intersectionCallback([entry], observer);
      // --- THEN ---
      expect(dom.importModule).toHaveBeenCalledWith(
        modulePath,
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('passes the article to querySelector when initializing', () => {
      // --- GIVEN ---
      createObserver(article, modulePath, functionName);
      intersectionCallback([entry], observer);
      const [, initializer] = dom.importModule.mock.calls[0];
      dom.querySelector.mockClear();
      const moduleFn = jest.fn();
      // --- WHEN ---
      initializer({ [functionName]: moduleFn });
      // --- THEN ---
      expect(dom.querySelector).toHaveBeenCalledWith(
        article,
        'input[type="text"]'
      );
    });

    it('initializes module with the provided function name', () => {
      // --- GIVEN ---
      createObserver(article, modulePath, functionName);
      intersectionCallback([entry], observer);
      const [, initializer] = dom.importModule.mock.calls[0];
      const moduleFn = jest.fn();
      // --- WHEN ---
      initializer({ [functionName]: moduleFn });
      dom.listeners.click({ preventDefault: jest.fn() });
      // --- THEN ---
      expect(moduleFn).toHaveBeenCalled();
    });

    it('initializes using the provided module info', () => {
      // --- GIVEN ---
      createObserver(article, modulePath, functionName);
      intersectionCallback([entry], observer);
      const [calledPath, initializer] = dom.importModule.mock.calls[0];
      const moduleFn = jest.fn();
      dom.querySelector.mockClear();
      // --- WHEN ---
      initializer({ [functionName]: moduleFn });
      dom.listeners.click({ preventDefault: jest.fn() });
      // --- THEN ---
      expect(calledPath).toBe(modulePath);
      expect(moduleFn).toHaveBeenCalled();
      expect(dom.querySelector).toHaveBeenCalledWith(
        article,
        'input[type="text"]'
      );
    });

    it('passes the article to initializeInteractiveComponent', () => {
      createObserver(article, modulePath, functionName);
      intersectionCallback([entry], observer);
      const [, initializer] = dom.importModule.mock.calls[0];
      initializer({ [functionName]: jest.fn() });
      expect(dom.querySelector).toHaveBeenCalledWith(
        article,
        'input[type="text"]'
      );
    });

    it('calls disconnectObserver when entry is intersecting', () => {
      // --- GIVEN ---
      createObserver(article, modulePath, functionName);
      // --- WHEN ---
      intersectionCallback([entry], observer);
      // --- THEN ---
      expect(dom.disconnectObserver).toHaveBeenCalledWith(observer);
    });

    it('passes module path to the error handler', () => {
      // --- GIVEN ---
      createObserver(article, modulePath, functionName);
      intersectionCallback([entry], observer);
      const [, , errorHandler] = dom.importModule.mock.calls[0];
      const error = new Error('oops');

      // --- WHEN ---
      errorHandler(error);

      // --- THEN ---
      expect(env.loggers.logError).toHaveBeenCalledWith(
        `[${undefined}]`, // article.id is undefined in this test context
        `Error loading module ${modulePath}:`,
        error
      );
    });

    it('does not call importModule when not intersecting', () => {
      // --- GIVEN ---
      const makeIntersectionObserver = jest.fn(fn => {
        intersectionCallback = fn;
        return expectedResult;
      });
      isIntersecting = () => false;
      dom = {
        makeIntersectionObserver,
        importModule: jest.fn(),
        disconnectObserver: jest.fn(),
        error: jest.fn(),
        isIntersecting,
        contains: () => true,
      };
      const createObserver = makeCreateIntersectionObserver(dom, env);
      createObserver(article, modulePath, functionName);
      // --- WHEN ---
      intersectionCallback([entry], observer);
      // --- THEN ---
      expect(dom.importModule).not.toHaveBeenCalled();
    });

    it('does not call disconnectObserver when not intersecting', () => {
      // --- GIVEN ---
      isIntersecting = () => false;
      dom.isIntersecting = isIntersecting;
      const createObserver = makeCreateIntersectionObserver(dom, env);
      createObserver(article, modulePath, functionName);
      // --- WHEN ---
      intersectionCallback([entry], observer);
      // --- THEN ---
      expect(dom.disconnectObserver).not.toHaveBeenCalled();
    });
  });

  describe('handleModuleError', () => {
    it('calls errorMock with the correct message', () => {
      // --- GIVEN ---
      const logError = jest.fn();
      const handler = handleModuleError(modulePath, logError);
      const error = new Error('fail');
      const expectedMessage = 'Error loading module mod:';
      // --- WHEN ---
      handler(error);
      // --- THEN ---
      expect(logError).toHaveBeenCalledWith(expectedMessage, error);
    });
  });

  describe('enableInteractiveControls', () => {
    let inputElement;
    let submitButton;
    let outputParentElement;
    let enable;
    let setTextContent;
    let removeWarning;
    let dom;
    let elements;
    let removeAllChildren;
    let appendChild;
    let removeChild;
    let createElement;
    let presenterKey;

    beforeEach(() => {
      // Mock input element
      inputElement = {};
      // Mock submit button
      submitButton = {};
      // Mock parent element
      outputParentElement = {};
      // Reset enable and setTextContent mocks for each test
      enable = jest.fn();
      setTextContent = jest.fn();
      removeWarning = jest.fn();
      const contains = () => true;
      removeAllChildren = jest.fn();
      appendChild = jest.fn();
      removeChild = jest.fn();
      createElement = jest.fn(() => ({}));
      presenterKey = 'text';
      dom = {
        setTextContent,
        removeWarning,
        enable,
        contains,
        removeAllChildren,
        createElement,
        appendChild,
        removeChild,
      };
      elements = { inputElement, submitButton, parent: outputParentElement };
    });

    it('enables input and submit button', () => {
      // --- WHEN ---
      enableInteractiveControls(elements, dom, presenterKey);
      // --- THEN ---
      expect(enable).toHaveBeenCalledWith(inputElement);
      expect(enable).toHaveBeenCalledWith(submitButton);
    });

    it('sets output textContent to "Ready for input" using parent branch', () => {
      // --- GIVEN ---
      const expectedText = 'Ready for input';
      const paragraph = {};
      const createElement = jest.fn(() => paragraph);
      dom.createElement = createElement;
      // --- WHEN ---
      enableInteractiveControls(elements, dom, presenterKey);
      // --- THEN ---
      expect(removeAllChildren).toHaveBeenCalledWith(outputParentElement);
      expect(appendChild).toHaveBeenCalledWith(outputParentElement, paragraph);
      expect(setTextContent).toHaveBeenCalledWith(paragraph, expectedText);
    });

    it('removes "warning" class from parent element', () => {
      // --- WHEN ---
      enableInteractiveControls(elements, dom, presenterKey);
      // --- THEN ---
      expect(removeWarning).toHaveBeenCalledWith(outputParentElement);
    });
  });

  describe('initialiseModule', () => {
    it('can be invoked with minimal arguments', () => {
      const functionName = 'process';
      const globalState = {};
      const get = () => {};
      const createEnv = () => ({ get });
      const error = () => {};
      const fetch = () => {};
      const paragraph = {};
      const outputParentElement = {};
      const outputElement = { textContent: '', outputParentElement };
      // Refactored querySelector to use a Map for selector-object pairs
      const selectorMap = new Map([
        ['input[type="text"]', {}],
        ['button[type="submit"]', {}],
        ['div.output > p', outputElement],
        ['div.output', outputElement.outputParentElement],
      ]);
      const querySelector = (el, selector) => {
        return selectorMap.get(selector) || {};
      };
      const dom = {
        removeAllChildren: jest.fn(),
        querySelector,
        addEventListener: jest.fn(),
        setTextContent: jest.fn(),
        removeWarning: jest.fn(),
        enable: jest.fn(),
        removeChild: jest.fn(),
        appendChild: jest.fn(),
        createElement: jest.fn(() => paragraph),
        contains: () => true,
      };
      // Pass globalState, createEnv, error, and fetch directly
      // Create config object as passed to initializeAndRenderComponent
      const config = {
        globalState,
        createEnvFn: createEnv,
        errorFn: error,
        fetchFn: fetch,
        dom,
        loggers: {
          logInfo: jest.fn(),
          logError: jest.fn(),
          logWarning: jest.fn(),
        },
      };
      // Use getModuleInitializer to create an initializer and invoke with a module
      const result = getModuleInitializer(article, functionName, config);
      const module = { [functionName]: jest.fn() };
      const response = result(module);
      // Expectations at end
      expect(response).toBeUndefined();
      expect(dom.removeAllChildren).toHaveBeenCalledWith(outputParentElement);
      expect(dom.createElement).toHaveBeenCalledWith('p');
      expect(dom.appendChild).toHaveBeenCalledWith(
        outputParentElement,
        paragraph
      );
    });

    it('passes the module function to initializeInteractiveComponent', () => {
      const functionName = 'initFn';
      const inputElement = { value: 'test', disabled: false };
      const submitButton = { disabled: false };
      const paragraph = {};
      const outputParentElement = {};
      const outputElement = { textContent: '', outputParentElement };
      const selectorMap = new Map([
        ['input[type="text"]', inputElement],
        ['button[type="submit"]', submitButton],
        ['div.output > p', outputElement],
        ['div.output', outputParentElement],
      ]);
      const querySelector = jest.fn(
        (el, selector) => selectorMap.get(selector) || {}
      );
      const listeners = {};
      const listenerTargets = new Map([
        [submitButton, 'click'],
        [inputElement, 'keypress'],
      ]);
      const addEventListener = jest.fn((element, event, handler) => {
        if (listenerTargets.get(element) === event) {
          listeners[event] = handler;
        }
      });
      const dom = {
        removeAllChildren: jest.fn(),
        createElement: jest.fn(() => paragraph),
        stopDefault: jest.fn(),
        addWarning: jest.fn(),
        addWarningFn: jest.fn(),
        addEventListener,
        removeChild: jest.fn(),
        appendChild: jest.fn(),
        querySelector,
        setTextContent: jest.fn((el, text) => {
          el.textContent = text;
        }),
        removeWarning: jest.fn(),
        enable: jest.fn(),
        contains: () => true,
      };
      const config = {
        globalState: {},
        createEnvFn: () => ({}),
        errorFn: jest.fn(),
        fetchFn: jest.fn(),
        dom,
        loggers: {
          logInfo: jest.fn(),
          logError: jest.fn(),
          logWarning: jest.fn(),
        },
      };
      const moduleFn = jest.fn(() => 'processed result');
      const init = getModuleInitializer(article, functionName, config);
      init({ [functionName]: moduleFn });
      listeners.keypress({ key: 'Enter', preventDefault: jest.fn() });
      expect(moduleFn).toHaveBeenCalledWith('test', expect.any(Object));
    });
  });

  describe('initializeInteractiveComponent', () => {
    let querySelector;
    let selectorMap;
    let inputElement;
    let submitButton;
    let outputElement;

    beforeEach(() => {
      inputElement = { value: 'test', disabled: false };
      submitButton = { disabled: false };
      outputElement = {
        textContent: '',
        outputParentElement: {
          classList: { remove: jest.fn() },
          removeChild: jest.fn(),
          appendChild: jest.fn(),
        },
      };
      selectorMap = new Map([
        ['input[type="text"]', inputElement],
        ['button[type="submit"]', submitButton],
        ['div.output > p', outputElement],
        ['div.output', outputElement.outputParentElement],
      ]);
      querySelector = jest.fn(
        (el, selector) => selectorMap.get(selector) || {}
      );
    });

    it('attaches click and keypress listeners with expected arguments', () => {
      const globalState = {};
      const createEnvFn = () => ({});
      const errorFn = jest.fn();
      const fetchFn = jest.fn();
      const createElement = jest
        .fn()
        .mockImplementation(() => ({ textContent: '' }));
      const stopDefault = jest.fn();
      const addWarning = jest.fn();
      const listeners = {};
      const isInputKeypress = (element, event) =>
        element === inputElement && event === 'keypress';
      const isSubmitClick = (element, event) =>
        element === submitButton && event === 'click';
      const handleInputKeypress = (element, event, handler) => {
        if (isInputKeypress(element, event)) {
          listeners.keypress = handler;
        }
      };
      const handleSubmitClick = (element, event, handler) => {
        if (isSubmitClick(element, event)) {
          listeners.click = handler;
        }
      };
      const addEventListener = jest.fn((element, event, handler) => {
        handleInputKeypress(element, event, handler);
        handleSubmitClick(element, event, handler);
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
        setTextContent: jest.fn((el, text) => {
          el.textContent = text;
        }),
        removeWarning: jest.fn(),
        enable: jest.fn(),
        contains: () => true,
      };
      const processingFunction = jest.fn(() => 'processed result');
      const config = {
        globalState,
        createEnvFn,
        errorFn,
        fetchFn,
        dom,
        loggers: {
          logInfo: jest.fn(),
          logError: jest.fn(),
          logWarning: jest.fn(),
        },
      };
      initializeInteractiveComponent(article, processingFunction, config);
      listeners.keypress({ key: 'Enter', preventDefault: jest.fn() });
      // Expectations at end
      expect(addEventListener).toHaveBeenCalledWith(
        submitButton,
        'click',
        expect.any(Function)
      );
      expect(addEventListener).toHaveBeenCalledWith(
        inputElement,
        'keypress',
        expect.any(Function)
      );
      expect(processingFunction).toHaveBeenCalledWith(
        'test',
        expect.any(Object)
      );
    });

    it('disables input and submit button during initialization', () => {
      const globalState = {};
      const createEnvFn = () => ({});
      const errorFn = jest.fn();
      const fetchFn = jest.fn();
      const dom = {
        removeAllChildren: jest.fn(),
        createElement: jest.fn(() => ({ textContent: '' })),
        stopDefault: jest.fn(),
        addWarning: jest.fn(),
        addWarningFn: jest.fn(),
        addEventListener: jest.fn(),
        removeChild: jest.fn(),
        appendChild: jest.fn(),
        querySelector,
        setTextContent: jest.fn(),
        removeWarning: jest.fn(),
        enable: jest.fn(),
        contains: () => true,
      };
      const processingFunction = jest.fn();
      const config = {
        globalState,
        createEnvFn,
        errorFn,
        fetchFn,
        dom,
        loggers: {
          logInfo: jest.fn(),
          logError: jest.fn(),
          logWarning: jest.fn(),
        },
      };
      initializeInteractiveComponent(article, processingFunction, config);
      expect(inputElement.disabled).toBe(true);
      expect(submitButton.disabled).toBe(true);
    });

    it('does not call handleSubmit when a non-Enter key is pressed', () => {
      const inputElement = { value: 'test', disabled: false };
      const submitButton = { disabled: false };
      const removeClass = jest.fn();
      const outputParentElement = { classList: { remove: removeClass } };
      const outputElement = {
        textContent: '',
        outputParentElement,
      };
      // Populate selectorMap for this test
      selectorMap.set('input[type="text"]', inputElement);
      selectorMap.set('button[type="submit"]', submitButton);
      selectorMap.set('div.output > p', outputElement);
      selectorMap.set('div.output', outputElement.outputParentElement);
      const globalState = {};
      const listeners2 = {};
      const isInputKeypress = (element, event) =>
        element === inputElement && event === 'keypress';
      const isSubmitClick = (element, event) =>
        element === submitButton && event === 'click';
      const handleInputKeypress = (element, event, handler) => {
        if (isInputKeypress(element, event)) {
          listeners2.keypress = handler;
        }
      };
      const handleSubmitClick = (element, event, handler) => {
        if (isSubmitClick(element, event)) {
          listeners2.click = handler;
        }
      };
      const addEvent = jest.fn((element, event, handler) => {
        handleInputKeypress(element, event, handler);
        handleSubmitClick(element, event, handler);
      });
      const removeAllChildren = jest.fn();
      const setTextContent = jest.fn();
      const removeWarning = jest.fn();
      const enable = jest.fn();
      const removeChild = jest.fn();
      const appendChild = jest.fn();
      const createElement = jest.fn(() => ({}));
      const contains = () => true;
      const dom = {
        removeAllChildren,
        querySelector,
        addEventListener: addEvent,
        setTextContent,
        removeWarning,
        enable,
        removeChild,
        appendChild,
        createElement,
        contains,
      };
      const createEnvFn = () => ({});
      const errorFn = jest.fn();
      const fetchFn = jest.fn();
      const processingFunction = jest.fn(() => 'processed result');
      const logInfo = jest.fn();
      const logError = jest.fn();
      const logWarning = jest.fn();
      const loggers = { logInfo, logError, logWarning };
      const config = {
        globalState,
        createEnvFn,
        errorFn,
        fetchFn,
        dom,
        loggers,
      };
      initializeInteractiveComponent(article, processingFunction, config);
      listeners2.keypress({ key: 'a', preventDefault: jest.fn() });
      // Expectations at end
      expect(processingFunction).not.toHaveBeenCalled();
    });

    it('queries the DOM for output elements using expected selectors', () => {
      const createEnvFn = () => ({});
      const errorFn = jest.fn();
      const fetchFn = jest.fn();
      const dom = {
        removeAllChildren: jest.fn(),
        createElement: jest.fn(() => ({ textContent: '' })),
        stopDefault: jest.fn(),
        addWarning: jest.fn(),
        addWarningFn: jest.fn(),
        addEventListener: jest.fn(),
        removeChild: jest.fn(),
        appendChild: jest.fn(),
        querySelector,
        setTextContent: jest.fn(),
        removeWarning: jest.fn(),
        enable: jest.fn(),
        contains: () => true,
      };
      const processingFunction = jest.fn();
      const config = {
        globalState: {},
        createEnvFn,
        errorFn,
        fetchFn,
        dom,
        loggers: {
          logInfo: jest.fn(),
          logError: jest.fn(),
          logWarning: jest.fn(),
        },
      };

      initializeInteractiveComponent(article, processingFunction, config);

      expect(querySelector).toHaveBeenCalledWith(article, 'div.output');
      expect(querySelector).toHaveBeenCalledWith(article, 'select.output');
    });

    it('sets initialising message using setTextContent', () => {
      const createEnvFn = () => ({});
      const errorFn = jest.fn();
      const fetchFn = jest.fn();
      const outputParent = {};
      const setTextContent = jest.fn();
      const createElement = jest.fn(() => ({ textContent: '' }));
      const selectorMap = {
        'input[type="text"]': {},
        'button[type="submit"]': {},
        'div.output': outputParent,
        'select.output': {},
      };
      const querySelectorFn = (_, selector) => selectorMap[selector] || {};
      const makeQuerySelector = () => querySelectorFn;
      const dom = {
        removeAllChildren: jest.fn(),
        createElement,
        setTextContent,
        stopDefault: jest.fn(),
        addWarning: jest.fn(),
        addWarningFn: jest.fn(),
        addEventListener: jest.fn(),
        removeChild: jest.fn(),
        appendChild: jest.fn(),
        querySelector: jest.fn(makeQuerySelector()),
        removeWarning: jest.fn(),
        enable: jest.fn(),
        contains: () => true,
      };
      const config = {
        globalState: {},
        createEnvFn,
        errorFn,
        fetchFn,
        dom,
        loggers: {
          logInfo: jest.fn(),
          logError: jest.fn(),
          logWarning: jest.fn(),
        },
      };
      const articleObj = {};
      const processingFunction = jest.fn();

      initializeInteractiveComponent(articleObj, processingFunction, config);

      expect(setTextContent).toHaveBeenNthCalledWith(
        1,
        expect.any(Object),
        'Initialising...'
      );
    });

    it('passes expected elements to enableInteractiveControls', () => {
      const createEnvFn = () => ({});
      const errorFn = jest.fn();
      const fetchFn = jest.fn();
      const outputParent = {};
      const selectorMap = {
        'input[type="text"]': inputElement,
        'button[type="submit"]': submitButton,
        'div.output': outputParent,
        'select.output': {},
      };
      const querySelector = (_, selector) => selectorMap[selector] || {};
      const dom = {
        removeAllChildren: jest.fn(),
        createElement: jest.fn(() => ({ textContent: '' })),
        setTextContent: jest.fn(),
        stopDefault: jest.fn(),
        addWarning: jest.fn(),
        addWarningFn: jest.fn(),
        addEventListener: jest.fn(),
        removeChild: jest.fn(),
        appendChild: jest.fn(),
        querySelector: jest.fn(querySelector),
        removeWarning: jest.fn(),
        enable: jest.fn(),
        contains: () => true,
      };
      const config = {
        globalState: {},
        createEnvFn,
        errorFn,
        fetchFn,
        dom,
        loggers: {
          logInfo: jest.fn(),
          logError: jest.fn(),
          logWarning: jest.fn(),
        },
      };
      const processingFunction = jest.fn();

      initializeInteractiveComponent(article, processingFunction, config);

      expect(dom.enable).toHaveBeenCalledWith(inputElement);
      expect(dom.enable).toHaveBeenCalledWith(submitButton);
      expect(dom.removeWarning).toHaveBeenCalledWith(outputParent);
    });
  });

  describe('initializeVisibleComponents', () => {
    let getInteractiveComponentCount;
    let interactiveComponents;
    let win;
    let logInfo;
    let logWarning;
    let getElement;
    let createIntersectionObserver;
    let hasNoInteractiveComponents;
    let getInteractiveComponents;
    let id;
    let functionName;
    let component;
    let env;
    let getComponentInitializer;
    // Explicit declaration ensures this mock is reset between tests
    let initializeComponent;

    beforeEach(() => {
      interactiveComponents = [];
      win = { interactiveComponents };
      logInfo = jest.fn();
      logWarning = jest.fn();
      getElement = jest.fn();
      createIntersectionObserver = jest.fn();
      hasNoInteractiveComponents = () => false;
      getInteractiveComponents = () => interactiveComponents;
      observer = { observe: jest.fn() };
      id = 'test-id';
      modulePath = 'path/to/module';
      functionName = 'initFunction';
      component = { id, modulePath, functionName };
      getInteractiveComponentCount = () => interactiveComponents.length;
      // Define initializeComponent as a Jest mock function for tracking calls
      initializeComponent = jest.fn();
      // getComponentInitializer is a Jest mock that returns initializeComponent
      getComponentInitializer = jest.fn(() => initializeComponent);
      env = {
        win,
        logInfo,
        logWarning,
        getElement,
        hasNoInteractiveComponents,
        getInteractiveComponents,
        getInteractiveComponentCount,
        getComponentInitializer,
      };
    });

    it('warns if there are no interactive components', () => {
      interactiveComponents = [];
      win = { interactiveComponents };
      hasNoInteractiveComponents = () => true;
      env = {
        win,
        logInfo,
        logWarning,
        getElement,
        hasNoInteractiveComponents,
        getInteractiveComponents,
        getInteractiveComponentCount,
        getComponentInitializer,
      };
      initializeVisibleComponents(env, createIntersectionObserver);
      expect(logWarning).toHaveBeenCalledWith(
        'No interactive components found to initialize'
      );
    });

    it('initializes and observes a valid interactive component', () => {
      interactiveComponents = [component];
      win = { interactiveComponents };
      getElement = () => article;
      env = {
        win,
        logInfo,
        logWarning,
        getElement,
        hasNoInteractiveComponents,
        getInteractiveComponents,
        getInteractiveComponentCount,
        getComponentInitializer,
      };
      createIntersectionObserver = jest.fn(() => observer);
      initializeVisibleComponents(env, createIntersectionObserver);
      // Expectations at end
      expect(logInfo).toHaveBeenCalledWith(
        'Initializing',
        1,
        'interactive components via IntersectionObserver'
      );
      expect(getComponentInitializer).toHaveBeenCalledWith(
        getElement,
        logWarning,
        createIntersectionObserver
      );
    });

    it('attempts to initialize all interactive components, regardless of missing fields', () => {
      const componentA = {
        id: 'a',
        modulePath: 'valid/path',
        functionName: '',
      };
      const componentB = { id: 'b', modulePath: '', functionName: 'fn' };
      const componentC = { id: 'c', modulePath: null, functionName: 'fn' };
      const componentD = { id: 'd', modulePath: 'valid', functionName: 'fn' };
      interactiveComponents = [componentA, componentB, componentC, componentD];
      win = { interactiveComponents };
      getElement = jest.fn(() => ({}));
      createIntersectionObserver = jest.fn(() => observer);
      env = {
        win,
        logInfo,
        logWarning,
        getElement,
        hasNoInteractiveComponents,
        getInteractiveComponents,
        getInteractiveComponentCount,
        getComponentInitializer,
      };
      initializeVisibleComponents(env, createIntersectionObserver);
      // Expectations at end
      expect(initializeComponent).toHaveBeenCalledTimes(4);
      expect(initializeComponent.mock.calls[0][0]).toEqual(componentA);
      expect(initializeComponent.mock.calls[1][0]).toEqual(componentB);
      expect(initializeComponent.mock.calls[2][0]).toEqual(componentC);
      expect(initializeComponent.mock.calls[3][0]).toEqual(componentD);
    });
  });
});

describe('createInputDropdownHandler', () => {
  // Shared test data and setup
  let event, select, container, textInput, numberInput, kvContainer, baseDom;
  let getCurrentTarget, getParentElement, querySelector;
  let reveal, enable, hide, disable, removeChild;

  // Helper function to get an element from the selector map
  const getElementFromMap = (selectorMap, parent, selector) => {
    if (parent !== container) {
      return null;
    }
    return selectorMap.get(selector);
  };

  // Helper function to create a querySelector mock
  const createQuerySelector = selectorMap =>
    jest.fn((parent, selector) =>
      getElementFromMap(selectorMap, parent, selector)
    );

  beforeEach(() => {
    // Given
    // Test data setup
    event = {};
    select = {};
    textInput = {};
    numberInput = {
      _dispose: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };
    kvContainer = { _dispose: jest.fn() };

    // Mock container with querySelector and appendChild
    container = {
      querySelector: jest.fn(),
      appendChild: jest.fn(),
      insertBefore: jest.fn(),
    };

    // Mock DOM functions
    getCurrentTarget = jest.fn(arg => {
      if (arg === event) {
        return select;
      }
      return null;
    });

    getParentElement = jest.fn(arg => {
      if (arg === select) {
        return container;
      }
      return null;
    });

    const selectorMap = new Map([
      ['input[type="text"]', textInput],
      ['input[type="number"]', numberInput],
      ['.kv-container', kvContainer],
    ]);

    querySelector = createQuerySelector(selectorMap);

    // Mock DOM manipulation functions
    reveal = jest.fn();
    enable = jest.fn();
    hide = jest.fn();
    disable = jest.fn();
    removeChild = jest.fn();

    // Create base DOM object with common functions
    baseDom = {
      getCurrentTarget,
      getParentElement,
      getNextSibling: element => element.nextSibling, // Add getNextSibling
      querySelector,
      reveal,
      enable,
      hide,
      disable,
      removeChild,
      addEventListener: jest.fn(),
    };
  });

  describe('when select value is kv', () => {
    it('should call getCurrentTarget with the event', () => {
      // Given
      const selectValue = 'kv';
      const getValue = jest.fn(element => {
        if (element === select) {
          return selectValue;
        }
        return null;
      });
      const createElement = jest.fn();
      const querySelector = jest.fn(() => null);
      const removeAllChildren = jest.fn();
      const insertBefore = jest.fn();
      const setClassName = jest.fn();

      // Create DOM mock object by extending baseDom
      const mockSelect = { value: 'kv' };
      const mockGetCurrentTarget = jest.fn().mockReturnValue(mockSelect);
      const dom = {
        ...baseDom,
        getValue,
        createElement,
        querySelector,
        removeAllChildren,
        insertBefore,
        setClassName,
        getCurrentTarget: mockGetCurrentTarget,
      };

      // Create the handler with the mocked DOM
      const handler = createInputDropdownHandler(dom);

      // Act - call the handler directly with the event
      handler(event);

      // Assert - verify getCurrentTarget was called with the event
      expect(dom.getCurrentTarget).toHaveBeenCalledWith(event);
    });
  });

  describe('when select value is text', () => {
    it('handles text input setup and cleanup of other input types', () => {
      // Given
      const selectValue = 'text';
      const getValue = jest.fn(element => {
        if (element === select) {
          return selectValue;
        }
        return null;
      });

      // Create DOM mock object by extending baseDom
      const dom = {
        ...baseDom,
        getValue,
      };

      // Create the handler with the mocked DOM
      const handler = createInputDropdownHandler(dom);

      // When
      handler(event);

      // Then - Verify text input is properly set up
      expect(reveal).toHaveBeenCalledWith(textInput);
      expect(enable).toHaveBeenCalledWith(textInput);

      // Verify number input is cleaned up
      expect(numberInput._dispose).toHaveBeenCalled();
      expect(removeChild).toHaveBeenCalledWith(container, numberInput);

      // Verify KV container is cleaned up
      expect(kvContainer._dispose).toHaveBeenCalled();
      expect(removeChild).toHaveBeenCalledWith(container, kvContainer);
    });
  });

  describe('when select value is number', () => {
    it('handles number input setup and cleanup when dropdown value is number', () => {
      // Given
      const eventTargetValue = {};
      const selectValue = 'number';
      const getValue = jest.fn(element => {
        if (element === select) {
          return selectValue;
        }
        return null;
      });

      // Create createElement mock
      const createElement = jest.fn(tagName => {
        if (tagName === 'input') {
          return numberInput;
        }
        return null;
      });

      // Create a selector map that doesn't include number input
      const numberSelectorMap = new Map([
        ['input[type="text"]', textInput],
        ['.kv-container', kvContainer],
      ]);

      // Create DOM mock object with the new querySelector
      const dom = {
        ...baseDom,
        getValue,
        createElement,
        getTargetValue: jest.fn(e => {
          if (e === event) {
            return eventTargetValue;
          }
          return null;
        }),
        setType: jest.fn(),
        setValue: jest.fn(),
        querySelector: createQuerySelector(numberSelectorMap),
      };

      // Create the handler with the mocked DOM
      const handler = createInputDropdownHandler(dom);

      // When
      handler(event);

      // Then - Verify KV container cleanup
      expect(kvContainer._dispose).toHaveBeenCalled();
      expect(removeChild).toHaveBeenCalledWith(container, kvContainer);

      // Verify text input state
      expect(hide).toHaveBeenCalledWith(textInput);
      expect(disable).toHaveBeenCalledWith(textInput);

      // Verify number input setup
      expect(dom.setType).toHaveBeenCalledWith(numberInput, 'number');
    });
  });

  describe('when select value is unknown', () => {
    it('falls back to the default handler', () => {
      const selectValue = 'unknown';
      const getValue = jest.fn(element => {
        if (element === select) {
          return selectValue;
        }
        return null;
      });
      const dom = {
        ...baseDom,
        getValue,
      };

      const handler = createInputDropdownHandler(dom);

      expect(() => handler(event)).not.toThrow();
      expect(hide).toHaveBeenCalledWith(textInput);
      expect(disable).toHaveBeenCalledWith(textInput);
    });
  });

  describe('getText', () => {
    it('should call response.text() and return its result', async () => {
      // Arrange
      const mockText = 'test response text';
      const mockResponse = {
        text: jest.fn().mockResolvedValue(mockText),
      };

      // Act
      const result = await getText(mockResponse);

      // Assert
      expect(mockResponse.text).toHaveBeenCalledTimes(1);
      expect(result).toBe(mockText);
    });

    it('should propagate errors from response.text()', async () => {
      // Arrange
      const mockError = new Error('Network error');
      const mockResponse = {
        text: jest.fn().mockRejectedValue(mockError),
      };

      // Act & Assert
      await expect(getText(mockResponse)).rejects.toThrow(mockError);
    });

    it('should throw when response is null or undefined', () => {
      // Act & Assert
      expect(() => getText(null)).toThrow(TypeError);
      expect(() => getText(undefined)).toThrow(TypeError);
    });
  });
});
