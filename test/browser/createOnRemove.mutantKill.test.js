import { describe, it, expect, jest } from '@jest/globals';
import { createOnRemove } from '../../src/browser/toys.js';

describe('createOnRemove mutant elimination', () => {
  it('removes the key and calls render when invoked', () => {
    const rows = { a: 1 };
    const render = jest.fn();
    const evt = { preventDefault: jest.fn() };

    createOnRemove(rows, render, 'a')(evt);

    expect(evt.preventDefault).toHaveBeenCalledTimes(1);
    expect(rows).toEqual({});
    expect(render).toHaveBeenCalledTimes(1);
  });

  it('returns a unique handler for each call', () => {
    const rows = { a: 1, b: 2 };
    const render = jest.fn();

    const handlerA = createOnRemove(rows, render, 'a');
    const handlerB = createOnRemove(rows, render, 'b');

    expect(typeof handlerA).toBe('function');
    expect(typeof handlerB).toBe('function');
    expect(handlerA).not.toBe(handlerB);
  });
});
