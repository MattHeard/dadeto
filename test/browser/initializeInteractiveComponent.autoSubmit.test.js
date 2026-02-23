import { describe, it, expect, jest } from '@jest/globals';
import { initializeInteractiveComponent } from '../../src/browser/toys.js';

describe('initializeInteractiveComponent auto submit checkbox', () => {
  it('registers and removes input listener based on checkbox state', () => {
    const article = { id: 'auto-test' };
    const inputElement = { value: 'test', disabled: false };
    const submitButton = { disabled: false };
    const outputParent = {
      classList: { remove: jest.fn() },
      removeChild: jest.fn(),
      appendChild: jest.fn(),
    };
    const outputSelect = {};
    const autoSubmitCheckbox = { checked: false, disabled: true };
    const selectorMap = new Map([
      ['input[type="text"]', inputElement],
      ['button[type="submit"]', submitButton],
      ['div.output', outputParent],
      ['select.output', outputSelect],
      ['.auto-submit-checkbox', autoSubmitCheckbox],
    ]);
    const querySelector = jest.fn((el, selector) => selectorMap.get(selector));

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
      querySelector,
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
    const processingFunction = jest.fn(() => 'result');

    initializeInteractiveComponent(article, processingFunction, config);

    const changeListener = addedListeners.find(
      entry =>
        entry.element === autoSubmitCheckbox && entry.event === 'change'
    );
    expect(changeListener).toBeDefined();
    expect(dom.enable).toHaveBeenCalledWith(autoSubmitCheckbox);

    const initialInputAdds = addedListeners.filter(
      entry => entry.element === inputElement && entry.event === 'input'
    );
    expect(initialInputAdds.length).toBeGreaterThanOrEqual(1);

    autoSubmitCheckbox.checked = true;
    changeListener.handler();

    const inputEntriesAfterToggle = addedListeners.filter(
      entry => entry.element === inputElement && entry.event === 'input'
    );
    expect(inputEntriesAfterToggle.length).toBe(initialInputAdds.length + 1);

    const autoInputListener = inputEntriesAfterToggle[inputEntriesAfterToggle.length - 1]
      .handler;
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
});
