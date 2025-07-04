import { describe, it, expect, jest } from '@jest/globals';
import { createDispose } from '../../src/browser/toys.js';

describe('createDispose instances', () => {
  it('returns a new dispose function on each call', () => {
    const dom = { removeAllChildren: jest.fn() };
    const container1 = {};
    const container2 = {};
    const rows1 = ['a'];
    const rows2 = ['b'];

    const first = createDispose({
      disposers: [],
      dom,
      container: container1,
      rows: rows1,
    });
    const second = createDispose({
      disposers: [],
      dom,
      container: container2,
      rows: rows2,
    });

    expect(typeof first).toBe('function');
    expect(typeof second).toBe('function');
    expect(first).not.toBe(second);

    first();
    second();
    expect(dom.removeAllChildren).toHaveBeenCalledWith(container1);
    expect(dom.removeAllChildren).toHaveBeenCalledWith(container2);
    expect(rows1).toHaveLength(0);
    expect(rows2).toHaveLength(0);
  });
});
