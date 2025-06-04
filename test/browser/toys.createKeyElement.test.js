import { jest } from '@jest/globals';
import { createKeyElement } from '../../src/browser/toys.js';

describe('createKeyElement', () => {
  let dom;
  let disposers;
  let keyEl;

  beforeEach(() => {
    keyEl = {};
    dom = {
      createElement: jest.fn().mockReturnValue(keyEl),
      setType: jest.fn(),
      setPlaceholder: jest.fn(),
      setValue: jest.fn(),
      setDataAttribute: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    };
    disposers = [];
  });

  it('creates an input element for the key', () => {
    const result = createKeyElement(dom, 'myKey', {}, {}, jest.fn(), disposers);

    expect(dom.createElement).toHaveBeenCalledTimes(1);
    expect(dom.createElement).toHaveBeenCalledWith('input');
    expect(result).toBe(keyEl);
  });

  it('adds a disposer that removes the listener', () => {
    createKeyElement(dom, 'myKey', {}, {}, jest.fn(), disposers);
    expect(disposers).toHaveLength(1);

    const onKey = dom.addEventListener.mock.calls[0][2];
    disposers[0]();

    expect(dom.removeEventListener).toHaveBeenCalledWith(keyEl, 'input', onKey);
  });
});
