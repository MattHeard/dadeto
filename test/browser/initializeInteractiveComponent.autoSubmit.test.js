import { describe, it, expect, jest } from '@jest/globals';
import { initializeInteractiveComponent } from '../../src/browser/toys.js';

const createAutoSubmitContext = ({ includeAutoSubmit = true } = {}) => {
  const inputElement = { value: 'test', disabled: false };
  const submitButton = { disabled: false };
  const outputParent = {
    classList: { remove: jest.fn() },
    removeChild: jest.fn(),
    appendChild: jest.fn(),
  };
  const outputSelect = { value: 'text' };
  const autoSubmitCheckbox = includeAutoSubmit
    ? { checked: false, disabled: true }
    : undefined;

  const selectors = new Map([
    ['input[type="text"]', inputElement],
    ['button[type="submit"]', submitButton],
    ['div.output', outputParent],
    ['select.output', outputSelect],
  ]);
  if (includeAutoSubmit && autoSubmitCheckbox) {
    selectors.set('.auto-submit-checkbox', autoSubmitCheckbox);
  }

  const addedListeners = [];
  const removedListeners = [];
  const dom = {
    removeAllChildren: jest.fn(),
    createElement: jest.fn(() => ({ textContent: '' })),
    setTextContent: jest.fn(),
    appendChild: jest.fn(),
    removeChild: jest.fn(),
    stopDefault: jest.fn(),
    addWarning: jest.fn(),
    addWarningFn: jest.fn(),
    querySelector: jest.fn((el, selector) => selectors.get(selector)),
    addEventListener: jest.fn((element, event, handler) => {
      addedListeners.push({ element, event, handler });
    }),
    removeWarning: jest.fn(),
    enable: jest.fn(),
    contains: () => true,
    removeEventListener: jest.fn((element, event, handler) => {
      removedListeners.push({ element, event, handler });
    }),
  };

  const config = {
    globalState: {},
    createEnvFn: () => new Map(),
    errorFn: jest.fn(),
    fetchFn: jest.fn(),
    dom,
    loggers: {
      logInfo: jest.fn(),
      logError: jest.fn(),
      logWarning: jest.fn(),
    },
  };

  return {
    dom,
    config,
    autoSubmitCheckbox,
    addedListeners,
    removedListeners,
    inputElement,
    submitButton,
  };
};

describe('initializeInteractiveComponent auto submit checkbox', () => {
  const article = { id: 'auto-test' };
  const createProcessingFunction = () => jest.fn(() => 'result');

  it('registers and removes the auto submit input listener', () => {
    const {
      config,
      autoSubmitCheckbox,
      addedListeners,
      removedListeners,
      inputElement,
    } = createAutoSubmitContext({ includeAutoSubmit: true });
    const processingFunction = createProcessingFunction();

    initializeInteractiveComponent(article, processingFunction, config);

    const changeListener = addedListeners.find(
      entry => entry.element === autoSubmitCheckbox && entry.event === 'change'
    );
    expect(changeListener).toBeDefined();
    expect(config.dom.enable).toHaveBeenCalledWith(autoSubmitCheckbox);

    const initialInputListeners = addedListeners.filter(
      entry => entry.element === inputElement && entry.event === 'input'
    );
    expect(initialInputListeners).toHaveLength(1);

    autoSubmitCheckbox.checked = true;
    changeListener.handler();

    const inputListenersAfterEnable = addedListeners.filter(
      entry => entry.element === inputElement && entry.event === 'input'
    );
    expect(inputListenersAfterEnable.length).toBe(
      initialInputListeners.length + 1
    );
    const autoInputListener =
      inputListenersAfterEnable[inputListenersAfterEnable.length - 1].handler;
    expect(removedListeners).toHaveLength(0);

    autoSubmitCheckbox.checked = false;
    changeListener.handler();

    expect(removedListeners).toHaveLength(1);
    expect(removedListeners[0]).toEqual({
      element: inputElement,
      event: 'input',
      handler: autoInputListener,
    });
  });

  it('does not register a second listener when already auto submitting', () => {
    const { config, autoSubmitCheckbox, addedListeners, inputElement } =
      createAutoSubmitContext({ includeAutoSubmit: true });
    const processingFunction = createProcessingFunction();

    initializeInteractiveComponent(article, processingFunction, config);

    const changeListener = addedListeners.find(
      entry => entry.element === autoSubmitCheckbox && entry.event === 'change'
    );
    autoSubmitCheckbox.checked = true;
    changeListener.handler();

    const inputListenersAfterFirstToggle = addedListeners.filter(
      entry => entry.element === inputElement && entry.event === 'input'
    ).length;

    changeListener.handler();

    const inputListenersAfterSecondToggle = addedListeners.filter(
      entry => entry.element === inputElement && entry.event === 'input'
    ).length;

    expect(inputListenersAfterSecondToggle).toBe(
      inputListenersAfterFirstToggle
    );
    expect(config.dom.removeEventListener).not.toHaveBeenCalled();
  });

  it('gracefully skips removal when no auto submit listener exists yet', () => {
    const { config, autoSubmitCheckbox, addedListeners } =
      createAutoSubmitContext({ includeAutoSubmit: true });
    const processingFunction = createProcessingFunction();

    initializeInteractiveComponent(article, processingFunction, config);

    const changeListener = addedListeners.find(
      entry => entry.element === autoSubmitCheckbox && entry.event === 'change'
    );

    changeListener.handler();

    expect(config.dom.removeEventListener).not.toHaveBeenCalled();
  });

  it('skips auto submit wiring when no checkbox exists', () => {
    const { config, addedListeners, inputElement, submitButton } =
      createAutoSubmitContext({ includeAutoSubmit: false });
    const processingFunction = createProcessingFunction();

    initializeInteractiveComponent(article, processingFunction, config);

    const changeListeners = addedListeners.filter(
      entry => entry.event === 'change'
    );
    expect(changeListeners).toHaveLength(0);

    expect(config.dom.enable.mock.calls).toEqual([
      [inputElement],
      [submitButton],
    ]);
  });
});
