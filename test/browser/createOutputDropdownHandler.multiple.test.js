import { describe, it, expect, jest } from '@jest/globals';
import { createOutputDropdownHandler } from '../../src/browser/toys.js';

describe('createOutputDropdownHandler multiple instances', () => {
  it('binds dependencies for each returned handler', () => {
    const handleDropdownChangeA = jest.fn().mockReturnValue('A');
    const handleDropdownChangeB = jest.fn().mockReturnValue('B');
    const getDataA = jest.fn();
    const getDataB = jest.fn();
    const dom = {};

    const handlerA = createOutputDropdownHandler(handleDropdownChangeA, getDataA, dom);
    const handlerB = createOutputDropdownHandler(handleDropdownChangeB, getDataB, dom);

    const eventA = { currentTarget: { id: 'a' } };
    const eventB = { currentTarget: { id: 'b' } };

    const resultA = handlerA(eventA);
    const resultB = handlerB(eventB);

    expect(resultA).toBe('A');
    expect(resultB).toBe('B');

    expect(handleDropdownChangeA).toHaveBeenCalledWith(eventA.currentTarget, getDataA, dom);
    expect(handleDropdownChangeB).toHaveBeenCalledWith(eventB.currentTarget, getDataB, dom);
  });
});
