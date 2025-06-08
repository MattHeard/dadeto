import { describe, it, expect, jest } from '@jest/globals';
import { setupAddButton, setupRemoveButton } from '../../src/browser/toys.js';

describe('button cleanup helpers', () => {
  it('setupAddButton disposer removes event listener', () => {
    const dom = {
      setTextContent: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };
    const button = {};
    const rows = {};
    const render = jest.fn();
    const disposers = [];
    setupAddButton(dom, button, rows, render, disposers);
    expect(disposers).toHaveLength(1);
    const dispose = disposers[0];
    expect(typeof dispose).toBe('function');
    dispose();
    expect(dom.removeEventListener).toHaveBeenCalledWith(
      button,
      'click',
      expect.any(Function)
    );
  });

  it('setupRemoveButton disposer removes event listener', () => {
    const dom = {
      setTextContent: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };
    const button = {};
    const rows = { k: 'v' };
    const render = jest.fn();
    const disposers = [];
    setupRemoveButton(dom, button, rows, render, 'k', disposers);
    expect(disposers).toHaveLength(1);
    const dispose = disposers[0];
    expect(typeof dispose).toBe('function');
    dispose();
    expect(dom.removeEventListener).toHaveBeenCalledWith(
      button,
      'click',
      expect.any(Function)
    );
  });
});
