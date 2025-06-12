import { describe, it, expect, jest } from '@jest/globals';
import { createOnRemove } from '../../src/browser/toys.js';

describe('createOnRemove multiple handlers', () => {
  it('creates independent handlers for different keys', () => {
    const rows = { a: '1', b: '2' };
    const render = jest.fn();
    const eventA = { preventDefault: jest.fn() };
    const eventB = { preventDefault: jest.fn() };

    const handlerA = createOnRemove(rows, render, 'a');
    const handlerB = createOnRemove(rows, render, 'b');

    expect(typeof handlerA).toBe('function');
    expect(typeof handlerB).toBe('function');
    expect(handlerA).not.toBe(handlerB);

    handlerA(eventA);
    handlerB(eventB);

    expect(rows).toEqual({});
    expect(render).toHaveBeenCalledTimes(2);
    expect(eventA.preventDefault).toHaveBeenCalledTimes(1);
    expect(eventB.preventDefault).toHaveBeenCalledTimes(1);
  });
});
