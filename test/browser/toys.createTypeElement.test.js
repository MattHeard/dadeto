import { jest } from '@jest/globals';
import {
  createTypeElement,
  createTypeToggleButton,
} from '../../src/browser/toys.js';

const makeDom = () => ({
  createElement: jest.fn(tag => {
    const el = { tag, _children: [], _listeners: {}, style: {} };
    return el;
  }),
  setType: jest.fn(),
  setTextContent: jest.fn(),
  addClass: jest.fn(),
  setValue: jest.fn(),
  appendChild: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  hide: jest.fn(),
  reveal: jest.fn(),
  getDataAttribute: jest.fn(),
  getValue: jest.fn(),
  createRemoveListener: jest.fn(() => jest.fn()),
});

describe('createTypeToggleButton', () => {
  it('creates a button element', () => {
    const dom = makeDom();
    const typeSelectEl = {};
    const disposers = [];
    createTypeToggleButton({ dom, typeSelectEl, disposers });
    expect(dom.createElement).toHaveBeenCalledWith('button');
  });

  it('hides the type select element initially', () => {
    const dom = makeDom();
    const typeSelectEl = {};
    const disposers = [];
    createTypeToggleButton({ dom, typeSelectEl, disposers });
    expect(dom.hide).toHaveBeenCalledWith(typeSelectEl);
  });

  it('adds a click listener to the button', () => {
    const dom = makeDom();
    const typeSelectEl = {};
    const disposers = [];
    createTypeToggleButton({ dom, typeSelectEl, disposers });
    expect(dom.addEventListener).toHaveBeenCalledWith(
      expect.anything(),
      'click',
      expect.any(Function)
    );
  });

  it('adds a disposer to the disposers array', () => {
    const dom = makeDom();
    const typeSelectEl = {};
    const disposers = [];
    createTypeToggleButton({ dom, typeSelectEl, disposers });
    expect(disposers).toHaveLength(1);
  });

  it('reveals the type select on first click', () => {
    const dom = makeDom();
    const typeSelectEl = {};
    const disposers = [];
    createTypeToggleButton({ dom, typeSelectEl, disposers });
    const [, , handler] = dom.addEventListener.mock.calls[0];
    handler();
    expect(dom.reveal).toHaveBeenCalledWith(typeSelectEl);
  });

  it('hides the type select on second click', () => {
    const dom = makeDom();
    const typeSelectEl = {};
    const disposers = [];
    createTypeToggleButton({ dom, typeSelectEl, disposers });
    const [, , handler] = dom.addEventListener.mock.calls[0];
    handler();
    handler();
    expect(dom.hide).toHaveBeenCalledTimes(2);
  });
});

describe('createTypeElement', () => {
  it('creates a select element', () => {
    const dom = makeDom();
    const disposers = [];
    createTypeElement({
      dom,
      key: 'myKey',
      rowData: { rows: {}, rowTypes: {} },
      textInput: {},
      keyEl: {},
      syncHiddenField: jest.fn(),
      disposers,
    });
    expect(dom.createElement).toHaveBeenCalledWith('select');
  });

  it('creates four option elements', () => {
    const dom = makeDom();
    const disposers = [];
    createTypeElement({
      dom,
      key: 'myKey',
      rowData: { rows: {}, rowTypes: {} },
      textInput: {},
      keyEl: {},
      syncHiddenField: jest.fn(),
      disposers,
    });
    const optionCalls = dom.createElement.mock.calls.filter(
      ([tag]) => tag === 'option'
    );
    expect(optionCalls).toHaveLength(4);
  });

  it('sets the initial value to the rowType for the key', () => {
    const dom = makeDom();
    const selectEl = {};
    dom.createElement.mockReturnValueOnce(selectEl);
    const disposers = [];
    createTypeElement({
      dom,
      key: 'count',
      rowData: { rows: {}, rowTypes: { count: 'number' } },
      textInput: {},
      keyEl: {},
      syncHiddenField: jest.fn(),
      disposers,
    });
    expect(dom.setValue).toHaveBeenCalledWith(selectEl, 'number');
  });

  it('defaults to string when key is absent from rowTypes', () => {
    const dom = makeDom();
    const selectEl = {};
    dom.createElement.mockReturnValueOnce(selectEl);
    const disposers = [];
    createTypeElement({
      dom,
      key: 'name',
      rowData: { rows: {}, rowTypes: {} },
      textInput: {},
      keyEl: {},
      syncHiddenField: jest.fn(),
      disposers,
    });
    expect(dom.setValue).toHaveBeenCalledWith(selectEl, 'string');
  });

  it('adds a change listener to the select element', () => {
    const dom = makeDom();
    const disposers = [];
    createTypeElement({
      dom,
      key: 'myKey',
      rowData: { rows: {}, rowTypes: {} },
      textInput: {},
      keyEl: {},
      syncHiddenField: jest.fn(),
      disposers,
    });
    expect(dom.addEventListener).toHaveBeenCalledWith(
      expect.anything(),
      'change',
      expect.any(Function)
    );
  });

  it('adds a disposer to the disposers array', () => {
    const dom = makeDom();
    const disposers = [];
    createTypeElement({
      dom,
      key: 'myKey',
      rowData: { rows: {}, rowTypes: {} },
      textInput: {},
      keyEl: {},
      syncHiddenField: jest.fn(),
      disposers,
    });
    expect(disposers).toHaveLength(1);
  });

  it('updates rowTypes and calls syncHiddenField on change', () => {
    const dom = makeDom();
    const selectEl = {};
    dom.createElement.mockReturnValueOnce(selectEl);
    dom.getDataAttribute.mockReturnValue('myKey');
    dom.getValue.mockReturnValue('number');
    const syncHiddenField = jest.fn();
    const rowData = { rows: {}, rowTypes: {} };
    const textInput = {};
    const keyEl = {};
    const disposers = [];
    createTypeElement({
      dom,
      key: 'myKey',
      rowData,
      textInput,
      keyEl,
      syncHiddenField,
      disposers,
    });
    const [, , changeHandler] = dom.addEventListener.mock.calls[0];
    changeHandler();
    expect(rowData.rowTypes.myKey).toBe('number');
    expect(syncHiddenField).toHaveBeenCalledWith(textInput, rowData, dom);
  });
});
