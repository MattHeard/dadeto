import { describe, it, expect, jest } from '@jest/globals';
import { createValueElement } from '../../src/browser/toys.js';

describe('createRemoveValueListener multiple removals', () => {
  it('disposers remove listeners for each value element', () => {
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

    const valueEl1 = createValueElement({
      dom,
      value: '',
      keyEl,
      textInput,
      rows,
      syncHiddenField: sync,
      disposers,
    });
    const valueEl2 = createValueElement({
      dom,
      value: '',
      keyEl,
      textInput,
      rows,
      syncHiddenField: sync,
      disposers,
    });

    const handler1 = dom.addEventListener.mock.calls[0][2];
    const handler2 = dom.addEventListener.mock.calls[1][2];

    disposers[0]();
    disposers[1]();

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
