import { describe, it, expect, jest } from '@jest/globals';
import { createOnRemove } from '../../src/browser/toys.js';

describe('createOnRemove additional tests', () => {
  it('removes the key and returns undefined', () => {
    const rows = { a: '1', b: '2' };
    const render = jest.fn();
    const event = { preventDefault: jest.fn() };
    const handler = createOnRemove(rows, render, 'a');

    const result = handler(event);

    expect(result).toBeUndefined();
    expect(rows).toEqual({ b: '2' });
    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(render).toHaveBeenCalledTimes(1);
  });

  it('returned handler accepts one argument', () => {
    const handler = createOnRemove({}, jest.fn(), 'x');
    expect(typeof handler).toBe('function');
    expect(handler.length).toBe(1);
  });

  it('createOnRemove expects three arguments', () => {
    expect(createOnRemove.length).toBe(3);
  });

  it('can be called multiple times on the same handler', () => {
    const rows = { a: '1' };
    const render = jest.fn();
    const event = { preventDefault: jest.fn() };
    const handler = createOnRemove(rows, render, 'a');

    handler(event);
    handler(event);

    expect(event.preventDefault).toHaveBeenCalledTimes(2);
    expect(render).toHaveBeenCalledTimes(2);
    expect(rows).toEqual({});
  });
});
