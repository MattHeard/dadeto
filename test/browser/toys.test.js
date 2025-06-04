import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  makeObserverCallback,
  makeCreateIntersectionObserver,
  enableInteractiveControls,
  getModuleInitializer,
  initializeVisibleComponents,
  getDeepStateCopy,
  createHandleSubmit,
  initializeInteractiveComponent,
  handleModuleError,
  handleDropdownChange,
  createAddDropdownListener,
  createInputDropdownHandler,
  createUpdateTextInputValue,
  getText,
} from '../../src/browser/toys.js';
import * as toysModule from '../../src/browser/toys.js';

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
    addListener(mockDropdown);

    // Assert
    expect(mockAddEventListener).toHaveBeenCalledTimes(1);
    expect(mockAddEventListener).toHaveBeenCalledWith(
      mockDropdown,
      'change',
      mockOnChange
    );
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

    it('handles missing output object without throwing', () => {
      const parent = { child: null, querySelector: jest.fn() };
      parent.querySelector.mockReturnValue(parent);
      const dropdown = {
        value: 'text',
        closest: jest.fn(() => ({ id: 'post-3' })),
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

    beforeEach(() => {
      expectedResult = {};
      const makeIntersectionObserver = jest.fn(fn => {
        intersectionCallback = fn;
        return expectedResult;
      });
      isIntersecting = () => true;
      dom = {
        makeIntersectionObserver,
        importModule: jest.fn(),
        disconnectObserver: jest.fn(),
        error: jest.fn(),
        isIntersecting,
        contains: () => true,
      };
      // Always provide loggers for moduleConfig compatibility
      env = { loggers: { logError: jest.fn() } };
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

    it('calls disconnectObserver when entry is intersecting', () => {
      // --- GIVEN ---
      createObserver(article, modulePath, functionName);
      // --- WHEN ---
      intersectionCallback([entry], observer);
      // --- THEN ---
      expect(dom.disconnectObserver).toHaveBeenCalledWith(observer);
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
      const createEnv = () => ({ get: () => {} });
      const error = () => {};
      const fetch = () => {};
      const paragraph = {};
      const outputParentElement = {};
      const outputElement = { textContent: '', outputParentElement };
      // Refactored querySelector to use a Map for selector-object pairs
      const selectorMap = new Map([
        ['input', {}],
        ['button', {}],
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
        removeAllChildren: jest.fn(),
        removeWarning: jest.fn(),
        enable: jest.fn(),
        removeChild: jest.fn(),
        appendChild: jest.fn(),
        createElement: jest.fn(() => paragraph),
        contains: () => true,
        removeAllChildren: jest.fn(),
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
  });

  describe('getModuleInitializer', () => {
    it('uses the exported module function when handling submit', () => {
      const functionName = 'process';
      const moduleFunction = jest.fn();
      const module = { [functionName]: moduleFunction };
      const listeners = {};
      const dom = {
        removeAllChildren: jest.fn(),
        querySelector: jest.fn(() => ({})),
        addEventListener: jest.fn((el, event, handler) => {
          listeners[event] = handler;
        }),
        stopDefault: jest.fn(),
        addWarning: jest.fn(),
        setTextContent: jest.fn(),
        removeWarning: jest.fn(),
        enable: jest.fn(),
        removeChild: jest.fn(),
        appendChild: jest.fn(),
        createElement: jest.fn(() => ({})),
        contains: () => true,
      };
      const config = {
        globalState: {},
        createEnvFn: jest.fn(() => jest.fn()),
        errorFn: jest.fn(),
        fetchFn: jest.fn(),
        dom,
        loggers: {
          logInfo: jest.fn(),
          logError: jest.fn(),
          logWarning: jest.fn(),
        },
      };

      const initializer = getModuleInitializer(article, functionName, config);
      initializer(module);

      listeners.click({ preventDefault: jest.fn() });

      expect(moduleFunction).toHaveBeenCalled();
    });
  });

  describe('getDeepStateCopy', () => {
    it('returns a deep copy of the global state object', () => {
      const globalState = {
        level1: {
          level2: {
            value: 'original',
          },
        },
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
        ['input', inputElement],
        ['button', submitButton],
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
        removeAllChildren: jest.fn(),
        removeWarning: jest.fn(),
        enable: jest.fn(),
        contains: () => true,
        removeAllChildren: jest.fn(),
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
      expect(addEventListener).toHaveBeenCalledTimes(2);
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
      selectorMap.set('input', inputElement);
      selectorMap.set('button', submitButton);
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

  // Helper function to create a querySelector mock
  const createQuerySelector = selectorMap =>
    jest.fn((parent, selector) =>
      parent === container ? selectorMap.get(selector) || null : null
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
    getCurrentTarget = jest.fn(arg => (arg === event ? select : null));
    getParentElement = jest.fn(arg => (arg === select ? container : null));

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
      const getValue = jest.fn(element =>
        element === select ? selectValue : null
      );
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
      const getValue = jest.fn(element =>
        element === select ? selectValue : null
      );

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
      const getValue = jest.fn(element =>
        element === select ? selectValue : null
      );

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
        getTargetValue: jest.fn(e => (e === event ? eventTargetValue : null)),
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
