import { describe, it, expect, jest } from '@jest/globals';
import { createValueElement } from '../../src/browser/toys.js';

describe('createRemoveValueListener via createValueElement', () => {
  it('stores a disposer that removes the input listener', () => {
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
    const disposers = [];

    const el = createValueElement(dom, '', keyEl, textInput, rows, sync, disposers);
    expect(el).toBeDefined();
    expect(disposers).toHaveLength(1);

    const handler = dom.addEventListener.mock.calls[0][2];
    disposers[0]();

    expect(dom.removeEventListener).toHaveBeenCalledWith(el, 'input', handler);
  });
});
