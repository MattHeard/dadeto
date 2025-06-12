import { describe, it, expect, jest } from '@jest/globals';
import { createOnRemove } from '../../src/browser/toys.js';

describe('createOnRemove mutant kill', () => {
  it('removes key and calls render when invoked', () => {
    const rows = { a: '1' };
    const render = jest.fn();
    const event = { preventDefault: jest.fn() };
    const handler = createOnRemove(rows, render, 'a');

    expect(typeof handler).toBe('function');
    expect(handler.length).toBe(1);

    handler(event);

    expect(rows).toEqual({});
    expect(render).toHaveBeenCalledTimes(1);
    expect(event.preventDefault).toHaveBeenCalledTimes(1);
  });
});
