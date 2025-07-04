import { describe, it, expect, jest } from '@jest/globals';
import { createValueElement } from '../../src/browser/toys.js';

describe('createRemoveValueListener repeated calls', () => {
  it('calls removeEventListener each time disposer is invoked', () => {
    const dom = {
      createElement: jest.fn(() => ({})),
      setType: jest.fn(),
      setPlaceholder: jest.fn(),
      setValue: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      getTargetValue: jest.fn(() => ''),
      getDataAttribute: jest.fn(() => ''),
      setDataAttribute: jest.fn(),
    };
    const disposers = [];
    const el = createValueElement({
      dom,
      value: '',
      keyEl: {},
      textInput: {},
      rows: {},
      syncHiddenField: jest.fn(),
      disposers,
    });
    const dispose = disposers[0];
    const handler = dom.addEventListener.mock.calls[0][2];

    dispose();
    dispose();

    expect(dom.removeEventListener).toHaveBeenCalledTimes(2);
    expect(dom.removeEventListener).toHaveBeenNthCalledWith(
      1,
      el,
      'input',
      handler
    );
    expect(dom.removeEventListener).toHaveBeenNthCalledWith(
      2,
      el,
      'input',
      handler
    );
  });
});
