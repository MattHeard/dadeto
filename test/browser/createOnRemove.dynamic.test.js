import { describe, it, expect, jest } from '@jest/globals';

describe('createOnRemove dynamic import', () => {
  it('removes the key and calls render', async () => {
    const { createOnRemove } = await import('../../src/browser/toys.js');
    const rows = { a: 1 };
    const render = jest.fn();
    const event = { preventDefault: jest.fn() };
    const handler = createOnRemove(rows, render, 'a');
    handler(event);
    expect(rows).toEqual({});
    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(render).toHaveBeenCalledTimes(1);
  });
});
