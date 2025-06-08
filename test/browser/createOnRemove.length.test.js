import { describe, it, expect, jest } from '@jest/globals';
import { createOnRemove } from '../../src/browser/toys.js';

describe('createOnRemove argument length', () => {
  it('expects three parameters and returns a unary function', () => {
    expect(createOnRemove.length).toBe(3);
    const rows = {};
    const render = jest.fn();
    const handler = createOnRemove(rows, render, 'key');
    expect(typeof handler).toBe('function');
    expect(handler.length).toBe(1);
  });
});
