import { describe, it, expect, jest } from '@jest/globals';
import { createValueElement } from '../../src/browser/toys.js';

describe('createRemoveValueListener unique disposers', () => {
  it('provides distinct disposer functions per element', () => {
    const dom = {
      createElement: jest.fn(() => ({})),
      setType: jest.fn(),
      setPlaceholder: jest.fn(),
      setValue: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      getTargetValue: jest.fn(() => 'v'),
      getDataAttribute: jest.fn(() => 'k'),
      setDataAttribute: jest.fn(),
    };
    const keyEl = { value: 'k' };
    const textInput = {};
    const rows = {};
    const sync = jest.fn();

    const disposers1 = [];
    const valueEl1 = createValueElement(
      dom,
      '',
      keyEl,
      textInput,
      rows,
      sync,
      disposers1
    );
    const disposer1 = disposers1[0];

    const disposers2 = [];
    const valueEl2 = createValueElement(
      dom,
      '',
      keyEl,
      textInput,
      rows,
      sync,
      disposers2
    );
    const disposer2 = disposers2[0];

    expect(typeof disposer1).toBe('function');
    expect(typeof disposer2).toBe('function');
    expect(disposer1).not.toBe(disposer2);

    const handler1 = dom.addEventListener.mock.calls[0][2];
    const handler2 = dom.addEventListener.mock.calls[1][2];
    disposer1();
    disposer2();
    expect(dom.removeEventListener).toHaveBeenCalledWith(
      valueEl1,
      'input',
      handler1
    );
    expect(dom.removeEventListener).toHaveBeenCalledWith(
      valueEl2,
      'input',
      handler2
    );
  });
});
