import { describe, it, expect, jest } from '@jest/globals';
import { setupRemoveButton } from '../../src/browser/toys.js';

describe('setupRemoveButton additional cases', () => {
  it('adds a unique disposer for each invocation', () => {
    const dom = {
      setTextContent: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };
    const rows = { a: 1, b: 2 };
    const render = jest.fn();
    const disposers = [];

    setupRemoveButton(dom, {}, rows, render, 'a', disposers);
    setupRemoveButton(dom, {}, rows, render, 'b', disposers);

    expect(disposers).toHaveLength(2);
    const [disposeA, disposeB] = disposers;
    expect(typeof disposeA).toBe('function');
    expect(typeof disposeB).toBe('function');
    expect(disposeA).not.toBe(disposeB);
  });
});
