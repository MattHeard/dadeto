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
  setClassName: jest.fn(),
});

describe('createTypeToggleButton', () => {
  it('creates a button element', () => {
    const dom = makeDom();
    const typeSelectEl = {};
    const disposers = [];
    createTypeToggleButton({ dom, typeSelectEl, disposers });
    expect(dom.createElement).toHaveBeenCalledWith('button');
    const button = dom.createElement.mock.results[0].value;
    expect(dom.setType).toHaveBeenCalledWith(button, 'button');
    expect(dom.setTextContent).toHaveBeenCalledWith(button, '\u25be');
    expect(dom.addClass).toHaveBeenCalledWith(button, 'kv-type-toggle');
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
    expect(dom.removeEventListener).not.toHaveBeenCalled();
    const disposer = disposers[0];
    const button = dom.createElement.mock.results[0].value;
    const clickHandler = dom.addEventListener.mock.calls[0][2];
    disposer();
    expect(dom.removeEventListener).toHaveBeenCalledWith(
      button,
      'click',
      clickHandler
    );
  });
});

describe('createTypeElement', () => {
  it('creates a select element', () => {
    const dom = makeDom();
    const disposers = [];
    createTypeElement({
      dom,
      currentType: 'string',
      onChange: jest.fn(),
      disposers,
    });
    expect(dom.createElement).toHaveBeenCalledWith('select');
    const select = dom.createElement.mock.results[0].value;
    expect(dom.addClass).toHaveBeenCalledWith(select, 'kv-type');
    expect(dom.setClassName).toHaveBeenCalledWith(
      expect.anything(),
      'select-wrapper'
    );
  });

  it('creates four option elements', () => {
    const dom = makeDom();
    const disposers = [];
    createTypeElement({
      dom,
      currentType: 'string',
      onChange: jest.fn(),
      disposers,
    });
    const optionCalls = dom.createElement.mock.calls.filter(
      ([tag]) => tag === 'option'
    );
    expect(optionCalls).toHaveLength(4);
  });

  it('sets the initial type value', () => {
    const dom = makeDom();
    const selectEl = {};
    dom.createElement.mockReturnValueOnce(selectEl);
    const disposers = [];
    createTypeElement({
      dom,
      currentType: 'number',
      onChange: jest.fn(),
      disposers,
    });
    expect(dom.setValue).toHaveBeenCalledWith(selectEl, 'number');
  });

  it('defaults to string when no type is supplied', () => {
    const dom = makeDom();
    const selectEl = {};
    dom.createElement.mockReturnValueOnce(selectEl);
    const disposers = [];
    createTypeElement({
      dom,
      currentType: undefined,
      onChange: jest.fn(),
      disposers,
    });
    expect(dom.setValue).toHaveBeenCalledWith(selectEl, 'string');
  });

  it('adds a change listener to the select element', () => {
    const dom = makeDom();
    const disposers = [];
    createTypeElement({
      dom,
      currentType: 'string',
      onChange: jest.fn(),
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
      currentType: 'string',
      onChange: jest.fn(),
      disposers,
    });
    expect(disposers).toHaveLength(1);
    const select = dom.createElement.mock.results[0].value;
    const changeHandler = dom.addEventListener.mock.calls[0][2];
    disposers[0]();
    expect(dom.removeEventListener).toHaveBeenCalledWith(
      select,
      'change',
      changeHandler
    );
  });

  it('forwards change events to the supplied handler', () => {
    const dom = makeDom();
    const selectEl = {};
    dom.createElement.mockReturnValueOnce(selectEl);
    const onChange = jest.fn();
    const disposers = [];
    createTypeElement({
      dom,
      currentType: 'string',
      onChange,
      disposers,
    });
    const [, , changeHandler] = dom.addEventListener.mock.calls[0];
    const event = { currentTarget: selectEl };
    changeHandler(event);
    expect(onChange).toHaveBeenCalledWith(event);
  });
});
