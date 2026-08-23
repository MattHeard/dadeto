import { jest } from '@jest/globals';
import {
  createDispose,
  createToysHandle,
  createAutoSubmitCheckboxHandler,
  initializeInteractiveComponent,
  toggleToyFocusMode,
  parseExistingRows,
  createRowData,
  toysTestOnly,
} from '../../../src/core/browser/toys.js';
import { readStoredOrElementValue } from '../../../src/core/browser/inputValueStore.js';

const utils = createToysHandle();

describe('toys additional coverage', () => {
  test('builds row metadata and keeps every input handler registered', () => {
    expect(createRowData({ first: 'value', second: false })).toEqual({
      rows: { first: 'value', second: false },
      rowTypes: { first: 'string', second: 'string' },
    });
    expect(toysTestOnly.inputHandlerTypes).toEqual(
      expect.arrayContaining([
        'text',
        'textarea',
        'life-seed',
        'file',
        'number',
        'kv',
        'blog-key',
        'real-hourly-wage',
        'dendrite-story',
        'dendrite-page',
        'moderator-ratings',
        'keyboard-capture',
        'mobile-controls',
        'gamepad-capture',
        'gamepad-button-mapper',
        'object-minute-asset',
        'possession-request',
        'default',
      ])
    );
  });

  test('adds and removes rows with exact state and render behavior', () => {
    const rowData = { rows: { keep: 'value' }, rowTypes: { keep: 'number' } };
    const render = jest.fn();
    const add = utils.createOnAddHandler(rowData, render);
    add();
    expect(rowData).toEqual({
      rows: { keep: 'value', '': '' },
      rowTypes: { keep: 'number', '': 'string' },
    });
    expect(render).toHaveBeenCalledTimes(1);
    add();
    expect(render).toHaveBeenCalledTimes(1);

    const preventDefault = jest.fn();
    const remove = utils.createOnRemove(rowData, render, 'keep');
    remove({ preventDefault });
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(rowData.rows).toEqual({ '': '' });
    expect(rowData.rowTypes).toEqual({ '': 'string' });
    expect(render).toHaveBeenCalledTimes(2);
  });

  test('provides usable empty row state when button setup receives null data', () => {
    const dom = {
      setTextContent: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };
    const render = jest.fn();
    const addDisposers = [];
    utils.setupAddButton({
      dom,
      button: {},
      rowData: null,
      render,
      disposers: addDisposers,
    });
    dom.addEventListener.mock.calls[0][2]();
    expect(render).toHaveBeenCalledTimes(1);

    const removeDisposers = [];
    utils.setupRemoveButton({
      dom,
      button: {},
      rowData: null,
      render,
      key: 'missing',
      disposers: removeDisposers,
    });
    dom.addEventListener.mock.calls[1][2]({ preventDefault: jest.fn() });
    expect(render).toHaveBeenCalledTimes(2);
  });

  test('normalizes stored rows from input and DOM fallbacks', () => {
    const input = { value: '' };
    expect(
      parseExistingRows(
        { getValue: jest.fn(() => '[{"key":"name","value":"Ada"}]') },
        input
      )
    ).toEqual({ name: 'Ada' });
    expect(
      parseExistingRows(
        { getValue: jest.fn(() => undefined) },
        { value: '{"name":"Grace"}' }
      )
    ).toEqual({ name: 'Grace' });
    expect(
      parseExistingRows(
        { getValue: jest.fn(() => 'not json') },
        { value: '' }
      )
    ).toEqual({});
    expect(
      parseExistingRows(
        { getValue: jest.fn(() => '{"count":0,"active":false}') },
        { value: '' }
      )
    ).toEqual({ count: 0, active: false });
    expect(parseExistingRows({}, { value: '' })).toEqual({});
    expect(parseExistingRows({}, { value: '5' })).toEqual({});
    expect(parseExistingRows({}, { value: 'null' })).toEqual({});
    expect(parseExistingRows({}, { value: '"text"' })).toEqual({});
    expect(parseExistingRows({}, { value: 'true' })).toEqual({});
    expect(
      parseExistingRows(
        { getValue: jest.fn(() => '{"from":"dom"}') },
        { value: '' }
      )
    ).toEqual({ from: 'dom' });
    expect(
      parseExistingRows(
        { getValue: jest.fn(() => '{"from":"dom"}') },
        { value: '{"from":"input"}' }
      )
    ).toEqual({ from: 'input' });
  });

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
    expect(() =>
      createDispose({
        disposers: [],
        dom,
        container: {},
        rowData: false,
        rows: undefined,
      })()
    ).not.toThrow();
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
    try {
      utils.requestAutoSubmitFrame({}, callback);
      throw new Error('expected requestAutoSubmitFrame to reject');
    } catch (error) {
      expect(error.constructor).toBe(Error);
      expect(error.message).toBe('dom.setTimeout is not a function');
    }
    const cancelRaf = jest.fn();
    utils.cancelAutoSubmitFrame({ cancelAnimationFrame: cancelRaf }, 4);
    utils.cancelAutoSubmitFrame({ clearTimeout: jest.fn() }, 5);
    utils.cancelAutoSubmitFrame({}, null);
    try {
      utils.cancelAutoSubmitFrame({}, 1);
      throw new Error('expected cancelAutoSubmitFrame to reject');
    } catch (error) {
      expect(error.constructor).toBe(Error);
      expect(error.message).toBe('dom.clearTimeout is not a function');
    }
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
});

describe('additional key/value toy coverage', () => {
  test('runs the key/value handler with an empty stored object', () => {
    const dom = {
      querySelector: jest.fn(() => null),
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
    expect(checkbox.checked).toBe(false);
    const inputHandler = listeners.find(
      entry => entry.element === input && entry.event === 'input'
    );
    delete dom.getValue;
    input.value = 'changed';
    inputHandler.handler();
    expect(input.value).toBe('changed');
    expect(readStoredOrElementValue(input)).toBe('changed');
    const checkboxHandler = listeners.find(
      entry => entry.element === checkbox && entry.event === 'change'
    );
    checkbox.checked = true;
    checkboxHandler.handler();
    expect(dom.requestAnimationFrame).toHaveBeenCalled();
    checkbox.checked = false;
    checkboxHandler.handler();
    expect(dom.cancelAnimationFrame).toHaveBeenCalledWith(11);
    expect(checkbox.checked).toBe(false);
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
});

describe('additional dropdown and focus coverage', () => {
  test('renders the selected post output and handles missing output', () => {
    const parent = {};
    const child = {};
    const dom = {
      querySelector: jest.fn(() => parent),
      removeAllChildren: jest.fn(),
      appendChild: jest.fn(),
      createElement: jest.fn(() => child),
      setTextContent: jest.fn(),
      setClassName: jest.fn(),
    };
    const dropdown = {
      value: 'text',
      closest: selector => {
        if (selector === 'article.entry') return { id: 'post-id' };
        if (selector === '.value') return {};
        return null;
      },
    };
    utils.handleDropdownChange(
      dropdown,
      () => ({ output: { 'post-id': { presenterKey: 'text', content: 'ok' } } }),
      dom
    );
    expect(dom.removeAllChildren).toHaveBeenCalledWith(parent);
    expect(dom.appendChild).toHaveBeenCalledWith(parent, child);
    expect(dom.querySelector).toHaveBeenCalledWith({}, 'div.output');
    expect(dom.setTextContent).toHaveBeenCalledWith(child, {
      presenterKey: 'text',
      content: 'ok',
    });

    dom.removeAllChildren.mockClear();
    utils.handleDropdownChange(
      dropdown,
      () => ({ output: null }),
      dom
    );
    expect(dom.removeAllChildren).toHaveBeenCalledWith(parent);
    expect(dom.setTextContent).toHaveBeenCalledWith(child, '');
    const noParentDropdown = {
      value: 'text',
      closest: selector =>
        selector === 'article.entry' ? { id: 'post-id' } : null,
    };
    dom.querySelector.mockClear();
    utils.handleDropdownChange(
      noParentDropdown,
      () => ({ output: { 'post-id': { presenterKey: 'text', content: 'ignored' } } }),
      dom
    );
    expect(dom.querySelector).not.toHaveBeenCalled();
    expect(dom.removeAllChildren).toHaveBeenCalledTimes(1);
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
        closest: selector => {
          if (selector === 'article.entry') return { id: 'post' };
          return null;
        },
      },
      () => ({ output: {} }),
      dom
    );
    expect(dom.querySelector).not.toHaveBeenCalled();
    utils.handleDropdownChange(
      {
        value: 'text',
        closest: selector => {
          if (selector === 'article.entry') return { id: 'post' };
          return {};
        },
      },
      () => ({ output: { post: { text: 'ok' } } }),
      dom
    );
    const article = { closest: jest.fn(() => null) };
    const button = { closest: jest.fn(() => article) };
    const enterFocusDom = {
      hasClass: jest.fn(() => false),
      addClass: jest.fn(),
      setTextContent: jest.fn(),
    };
    utils.toggleToyFocusMode(button, enterFocusDom);
    expect(button.closest).toHaveBeenCalledWith('article.entry');
    expect(enterFocusDom.addClass).toHaveBeenCalledWith(
      article,
      'toy-focus-mode'
    );
    expect(enterFocusDom.hasClass).toHaveBeenCalledWith(
      article,
      'toy-focus-mode'
    );
    expect(enterFocusDom.setTextContent).toHaveBeenCalledWith(
      button,
      'Exit focus mode'
    );
    const enterWithHostDom = {
      hasClass: () => false,
      addClass: jest.fn(),
      setTextContent: jest.fn(),
    };
    const articleWithHost = { closest: () => ({}) };
    utils.toggleToyFocusMode(
      { closest: () => articleWithHost },
      enterWithHostDom
    );
    expect(enterWithHostDom.addClass).toHaveBeenCalledTimes(2);
    expect(enterWithHostDom.addClass).toHaveBeenCalledWith(
      expect.any(Object),
      'toy-focus-mode-host'
    );
    const host = {};
    const focusArticle = { closest: jest.fn(() => host) };
    const focusButton = { closest: jest.fn(() => focusArticle) };
    const focusDom = {
      hasClass: jest.fn(() => true),
      removeClass: jest.fn(),
      setTextContent: jest.fn(),
    };
    utils.toggleToyFocusMode(focusButton, focusDom);
    expect(focusButton.closest).toHaveBeenCalledWith('article.entry');
    expect(focusArticle.closest).toHaveBeenCalledWith('#container');
    expect(focusDom.removeClass).toHaveBeenCalledWith(
      host,
      'toy-focus-mode-host'
    );
    expect(focusDom.setTextContent).toHaveBeenCalledWith(
      focusButton,
      'Focus mode'
    );
    expect(focusDom.hasClass).toHaveBeenCalledWith(
      focusArticle,
      'toy-focus-mode'
    );
    expect(focusDom.removeClass).toHaveBeenCalledWith(
      focusArticle,
      'toy-focus-mode'
    );
    const noHostArticle = { closest: jest.fn(() => null) };
    const noHostButton = { closest: jest.fn(() => noHostArticle) };
    const noHostDom = {
      hasClass: jest.fn(() => true),
      removeClass: jest.fn(),
      setTextContent: jest.fn(),
    };
    utils.toggleToyFocusMode(noHostButton, noHostDom);
    expect(noHostDom.removeClass).toHaveBeenCalledTimes(1);
    const activeNoHostArticle = { closest: jest.fn(() => null) };
    const activeNoHostButton = {
      closest: jest.fn(() => activeNoHostArticle),
    };
    const activeNoHostDom = {
      hasClass: jest.fn(() => false),
      addClass: jest.fn(),
      setTextContent: jest.fn(),
    };
    utils.toggleToyFocusMode(activeNoHostButton, activeNoHostDom);
    expect(activeNoHostDom.addClass).toHaveBeenCalledTimes(1);
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
    const migratedRows = { old: 'value' };
    const migratedTypes = { old: 'number' };
    const migratedData = { rows: migratedRows, rowTypes: migratedTypes };
    const migrateKey = {};
    dom.getDataAttribute.mockReturnValue('old');
    dom.getTargetValue.mockReturnValue('new');
    utils
      .createKeyInputHandler({
        dom,
        keyEl: migrateKey,
        textInput: {},
        rowData: migratedData,
        syncHiddenField: sync,
      })
      ({ target: {} });
    expect(migratedRows).toEqual({ new: 'value' });
    expect(migratedTypes).toEqual({ new: 'number' });
    const defaultTypeRows = { old: 'value' };
    const defaultTypeData = { rows: defaultTypeRows, rowTypes: {} };
    utils
      .createKeyInputHandler({
        dom,
        keyEl: {},
        textInput: {},
        rowData: defaultTypeData,
        syncHiddenField: sync,
      })
      ({ target: {} });
    expect(defaultTypeData.rowTypes).toEqual({ new: 'string' });
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
    expect(dom.createElement).toHaveBeenCalledWith('select');
    expect(dom.setClassName).toHaveBeenCalledWith(
      expect.any(Object),
      'select-wrapper'
    );
    expect(dom.createElement).toHaveBeenCalledWith('span');
    expect(dom.appendChild).toHaveBeenCalled();
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
