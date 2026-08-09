import { jest } from '@jest/globals';
import {
  createDispose,
  createToysHandle,
  createAutoSubmitCheckboxHandler,
  initializeInteractiveComponent,
  toggleToyFocusMode,
} from '../../../src/core/browser/toys.js';

describe('toys additional coverage', () => {
  const utils = createToysHandle();
  test('clears object-backed row data during dispose', () => {
    const rowData = { rows: { first: {} }, rowTypes: { first: 'text' } };
    const dom = { removeAllChildren: jest.fn() };
    const dispose = createDispose({
      disposers: [jest.fn()],
      dom,
      container: {},
      rowData,
    });
    dispose();
    expect(rowData).toEqual({ rows: {}, rowTypes: {} });
    const legacyRows = [];
    createDispose({
      disposers: [],
      dom,
      container: {},
      rowData: false,
      rows: legacyRows,
    })();
    expect(legacyRows).toHaveLength(0);
    const populatedRows = [{}];
    createDispose({
      disposers: [],
      dom,
      container: {},
      rowData: undefined,
      rows: populatedRows,
    })();
    expect(populatedRows).toHaveLength(0);
  });

  test('ignores focus toggles outside an article', () => {
    expect(
      toggleToyFocusMode({ closest: jest.fn(() => null) }, {})
    ).toBeUndefined();
  });

  test('logs and stops when an interactive article lacks controls', () => {
    const logWarning = jest.fn();
    initializeInteractiveComponent({ id: 'missing-controls' }, jest.fn(), {
      globalState: {},
      createEnvFn: jest.fn(),
      errorFn: jest.fn(),
      fetchFn: jest.fn(),
      getUuid: jest.fn(),
      loggers: { logInfo: jest.fn(), logWarning },
      dom: {
        querySelector: jest.fn(() => null),
        querySelectorAll: jest.fn(() => []),
      },
    });
    expect(logWarning).toHaveBeenCalled();
  });

  test('covers auto-submit scheduling and input fallbacks', () => {
    const input = { value: 'element' };
    expect(utils.readLiveInputValue({ getValue: () => 'dom' }, input)).toBe(
      'dom'
    );
    expect(utils.readLiveInputValue({ getValue: () => undefined }, input)).toBe(
      'element'
    );
    expect(utils.readLiveInputValue({ getValue: () => undefined }, {})).toBe(
      ''
    );
    const callback = jest.fn();
    const raf = jest.fn(() => 4);
    expect(
      utils.requestAutoSubmitFrame({ requestAnimationFrame: raf }, callback)
    ).toBe(4);
    let timerCallback;
    const timer = jest.fn(callback => {
      timerCallback = callback;
      return 5;
    });
    expect(utils.requestAutoSubmitFrame({ setTimeout: timer }, callback)).toBe(
      5
    );
    timerCallback();
    expect(() => utils.requestAutoSubmitFrame({}, callback)).toThrow(
      'setTimeout'
    );
    const cancelRaf = jest.fn();
    utils.cancelAutoSubmitFrame({ cancelAnimationFrame: cancelRaf }, 4);
    utils.cancelAutoSubmitFrame({ clearTimeout: jest.fn() }, 5);
    utils.cancelAutoSubmitFrame({}, null);
    expect(() => utils.cancelAutoSubmitFrame({}, 1)).toThrow('clearTimeout');
    const state = { frameId: 1, lastValue: 'old' };
    utils.registerAutoSubmitPolling({
      elements: {},
      processingFunction: jest.fn(),
      env: { dom: {} },
      inputElement: input,
      autoSubmitState: state,
    });
    expect(state.frameId).toBe(1);
    utils.unregisterAutoSubmitPolling({ clearTimeout: jest.fn() }, state);
    expect(state).toEqual({ frameId: null, lastValue: null });
    const scheduled = [];
    const pollingState = { frameId: null, lastValue: null };
    utils.registerAutoSubmitPolling({
      elements: {
        inputElement: input,
        outputParentElement: {},
        outputSelect: { value: 'text' },
        article: { id: 'poll' },
      },
      processingFunction: jest.fn(() => 'value'),
      env: {
        dom: {
          getValue: () => 'polled',
          requestAnimationFrame: callback => {
            scheduled.push(callback);
            return 9;
          },
          setTextContent: jest.fn(),
          addWarning: jest.fn(),
          removeAllChildren: jest.fn(),
          appendChild: jest.fn(),
          createElement: jest.fn(() => ({})),
        },
        createEnv: () => ({}),
        errorFn: jest.fn(),
      },
      inputElement: input,
      autoSubmitState: pollingState,
    });
    expect(pollingState).toEqual({ frameId: 9, lastValue: 'polled' });
    scheduled[0]();
  });

  test('runs the key/value handler with an empty stored object', () => {
    const dom = {
      querySelector: jest.fn((container, selector) =>
        selector === '.kv-container' ? null : null
      ),
      querySelectorAll: jest.fn(() => []),
      createElement: jest.fn(() => ({})),
      setClassName: jest.fn(),
      setType: jest.fn(),
      setClassName: jest.fn(),
      setClassName: jest.fn(),
      setPlaceholder: jest.fn(),
      setValue: jest.fn(),
      setDataAttribute: jest.fn(),
      getDataAttribute: jest.fn(),
      getNextSibling: jest.fn(),
      insertBefore: jest.fn(),
      removeAllChildren: jest.fn(),
      removeChild: jest.fn(),
      addEventListener: jest.fn(),
      setTextContent: jest.fn(),
      appendChild: jest.fn(),
      addClass: jest.fn(),
      hide: jest.fn(),
      disable: jest.fn(),
      getValue: jest.fn(() => '{"first":"value"}'),
    };
    expect(() => utils.kvHandler(dom, {}, {})).not.toThrow();
  });

  test('initializes controls and handles input and auto-submit changes', () => {
    const input = { value: 'initial', disabled: false };
    const button = { disabled: false };
    const output = {
      classList: { remove: jest.fn() },
      removeChild: jest.fn(),
      appendChild: jest.fn(),
    };
    const select = { value: 'text' };
    const checkbox = { checked: false, disabled: true };
    const listeners = [];
    const selectors = new Map([
      ['input[type="text"]', input],
      ['button[type="submit"]', button],
      ['div.output', output],
      ['select.output', select],
      ['.auto-submit-checkbox', checkbox],
    ]);
    const dom = {
      querySelector: jest.fn((_, selector) => selectors.get(selector)),
      addEventListener: jest.fn((element, event, handler) =>
        listeners.push({ element, event, handler })
      ),
      getValue: jest.fn(() => undefined),
      setTextContent: jest.fn(() => ({})),
      removeAllChildren: jest.fn(),
      createElement: jest.fn(() => ({})),
      appendChild: jest.fn(),
      removeChild: jest.fn(),
      stopDefault: jest.fn(),
      addWarning: jest.fn(),
      removeWarning: jest.fn(),
      enable: jest.fn(),
      contains: jest.fn(() => true),
      requestAnimationFrame: jest.fn(() => 11),
      cancelAnimationFrame: jest.fn(),
    };
    initializeInteractiveComponent(
      { id: 'complete-controls' },
      jest.fn(() => 'result'),
      {
        globalState: {},
        createEnvFn: jest.fn(() => ({})),
        errorFn: jest.fn(),
        fetchFn: jest.fn(),
        dom,
        getUuid: jest.fn(),
        loggers: { logInfo: jest.fn(), logWarning: jest.fn() },
      }
    );
    const inputHandler = listeners.find(
      entry => entry.element === input && entry.event === 'input'
    );
    inputHandler.handler();
    expect(input.value).toBe('initial');
    const checkboxHandler = listeners.find(
      entry => entry.element === checkbox && entry.event === 'change'
    );
    checkbox.checked = true;
    checkboxHandler.handler();
    expect(dom.requestAnimationFrame).toHaveBeenCalled();
    checkbox.checked = false;
    checkboxHandler.handler();
    expect(dom.cancelAnimationFrame).toHaveBeenCalledWith(11);
    expect(utils.getDeepStateCopy({ nested: { value: 1 } })).toEqual({
      nested: { value: 1 },
    });
  });

  test('handles an auto-submit change when the checkbox is absent', () => {
    const register = jest.fn();
    const unregister = jest.fn();
    createAutoSubmitCheckboxHandler({
      autoSubmitCheckbox: null,
      register,
      unregister,
    })();
    expect(register).not.toHaveBeenCalled();
    expect(unregister).not.toHaveBeenCalled();
  });

  test('covers dropdown, focus, row handlers, and fallback row data', () => {
    const sync = jest.fn();
    const dom = {
      querySelector: jest.fn(() => ({})),
      getDataAttribute: jest.fn(() => 'old'),
      setDataAttribute: jest.fn(),
      getTargetValue: jest.fn(() => 'new'),
      getValue: jest.fn(() => 'number'),
      setValue: jest.fn(),
      createElement: jest.fn(() => ({})),
      setType: jest.fn(),
      setClassName: jest.fn(),
      setPlaceholder: jest.fn(),
      setTextContent: jest.fn(),
      addClass: jest.fn(),
      hide: jest.fn(),
      reveal: jest.fn(),
      appendChild: jest.fn(),
      addEventListener: jest.fn(),
      removeAllChildren: jest.fn(),
    };
    utils.handleDropdownChange(
      {
        value: 'text',
        closest: selector =>
          selector === 'article.entry' ? { id: 'post' } : null,
      },
      () => ({ output: {} }),
      dom
    );
    utils.handleDropdownChange(
      {
        value: 'text',
        closest: selector =>
          selector === 'article.entry' ? { id: 'post' } : {},
      },
      () => ({ output: { post: { text: 'ok' } } }),
      dom
    );
    const article = { closest: () => null };
    const button = { closest: () => article };
    utils.toggleToyFocusMode(button, {
      hasClass: () => false,
      addClass: jest.fn(),
      setTextContent: jest.fn(),
    });
    const host = {};
    const focusArticle = { closest: () => host };
    const focusButton = { closest: () => focusArticle };
    const focusDom = {
      hasClass: () => true,
      removeClass: jest.fn(),
      setTextContent: jest.fn(),
    };
    utils.toggleToyFocusMode(focusButton, focusDom);
    expect(focusDom.removeClass).toHaveBeenCalledWith(
      host,
      'toy-focus-mode-host'
    );
    utils.toggleToyFocusMode(
      { closest: () => ({ closest: () => null }) },
      focusDom
    );
    const keyHandler = utils.createKeyInputHandler({
      dom,
      keyEl: {},
      textInput: {},
      syncHiddenField: sync,
    });
    keyHandler({});
    dom.getDataAttribute.mockReturnValue('same');
    dom.getTargetValue.mockReturnValue('same');
    keyHandler({});
    const valueHandler = utils.createValueInputHandler({
      dom,
      keyEl: {},
      textInput: {},
      rowData: null,
      syncHiddenField: sync,
    });
    valueHandler({});
    const type = utils.createTypeElement({
      dom,
      key: 'key',
      rowData: null,
      textInput: {},
      keyEl: {},
      syncHiddenField: sync,
      disposers: [],
    });
    expect(type).toBeDefined();
    dom.getDataAttribute.mockReturnValue(null);
    const typeChange = dom.addEventListener.mock.calls.find(
      call => call[1] === 'change'
    )?.[2];
    typeChange?.();
    const add = {};
    utils.setupAddButton({
      dom,
      button: add,
      render: jest.fn(),
      disposers: [],
    });
    utils.setupRemoveButton({
      dom,
      button: {},
      key: 'key',
      render: jest.fn(),
      disposers: [],
    });
    const renderer = utils.createRenderer({
      dom,
      disposersArray: [],
      container: {},
      rowData: null,
      textInput: {},
      syncHiddenField: sync,
    });
    expect(renderer).toBeDefined();
    renderer();
    utils.syncRowData(sync, {}, null, dom);
  });
});
