import { describe, it, expect, jest } from '@jest/globals';
import { createDispose } from '../../src/browser/toys.js';

describe('createDispose', () => {
  it('can be called and disposed', () => {
    // Verify the factory function expects one parameter
    expect(createDispose.length).toBe(1);
    // Mock the required parameters
    const disposer = jest.fn();
    const disposers = [disposer];
    const dom = {
      removeAllChildren: jest.fn(),
    };
    const container = {};
    const rows = ['row'];

    // Create and call dispose
    const dispose = createDispose({ disposers, dom, container, rows });

    // Ensure a function was returned
    expect(typeof dispose).toBe('function');

    dispose();

    // Verify the cleanup was performed
    expect(disposer).toHaveBeenCalled();
    expect(disposers).toHaveLength(0);
    expect(dom.removeAllChildren).toHaveBeenCalledWith(container);
    expect(rows).toHaveLength(0);
  });

  it('clears all registered disposers', () => {
    expect(createDispose.length).toBe(1);
    const disposer1 = jest.fn();
    const disposer2 = jest.fn();
    const disposers = [disposer1, disposer2];
    const dom = {
      removeAllChildren: jest.fn(),
    };
    const container = {};
    const rows = ['a', 'b'];

    const dispose = createDispose({ disposers, dom, container, rows });
    expect(typeof dispose).toBe('function');

    dispose();

    expect(disposer1).toHaveBeenCalled();
    expect(disposer2).toHaveBeenCalled();
    expect(disposers).toHaveLength(0);
    expect(rows).toHaveLength(0);
    expect(dom.removeAllChildren).toHaveBeenCalledWith(container);
  });

  it('can be called multiple times without errors', () => {
    const disposer = jest.fn();
    const disposers = [disposer];
    const dom = {
      removeAllChildren: jest.fn(),
    };
    const container = {};
    const rows = ['x'];

    const dispose = createDispose({ disposers, dom, container, rows });

    expect(() => dispose()).not.toThrow();
    expect(() => dispose()).not.toThrow();

    expect(disposer).toHaveBeenCalledTimes(1);
    expect(dom.removeAllChildren).toHaveBeenCalledTimes(2);
    expect(rows).toHaveLength(0);
  });

  it('returns a zero argument function', () => {
    const disposers = [];
    const dom = {
      removeAllChildren: jest.fn(),
    };
    const container = {};
    const rows = [];

    const dispose = createDispose({ disposers, dom, container, rows });
    expect(typeof dispose).toBe('function');
    expect(dispose.length).toBe(0);

    dispose();
    expect(dom.removeAllChildren).toHaveBeenCalledWith(container);
    expect(rows).toHaveLength(0);
  });

  it('handles empty disposers without errors', () => {
    const container = {};

    // scenario: array has an existing row
    const dom1 = { removeAllChildren: jest.fn() };
    const rows1 = ['x'];
    const dispose1 = createDispose({ disposers: [], dom: dom1, container, rows: rows1 });
    expect(() => dispose1()).not.toThrow();
    expect(dom1.removeAllChildren).toHaveBeenCalledWith(container);
    expect(rows1).toHaveLength(0);

    // scenario: array already empty
    const dom2 = { removeAllChildren: jest.fn() };
    const rows2 = [];
    const dispose2 = createDispose({ disposers: [], dom: dom2, container, rows: rows2 });
    expect(typeof dispose2).toBe('function');
    expect(() => dispose2()).not.toThrow();
    expect(dom2.removeAllChildren).toHaveBeenCalledWith(container);
    expect(rows2).toHaveLength(0);
  });
});
