import { describe, expect, it, jest } from '@jest/globals';
import { handleDropdownChange } from '../../src/browser/toys.js';

describe('setTextContent via handleDropdownChange', () => {
  it('uses the canvas presenter for "canvas-2d" output', () => {
    const created = {};
    const dom = {
      querySelector: jest.fn(() => created),
      removeAllChildren: jest.fn(),
      appendChild: jest.fn(),
      createElement: jest.fn(tag =>
        tag === 'canvas'
          ? {
              width: 0,
              height: 0,
              getContext: jest.fn(() => ({
                fillRect: jest.fn(),
                beginPath: jest.fn(),
                arc: jest.fn(),
                fill: jest.fn(),
                moveTo: jest.fn(),
                lineTo: jest.fn(),
                stroke: jest.fn(),
              })),
            }
          : { tagName: tag.toUpperCase() }
      ),
      setTextContent: jest.fn(),
      setClassName: jest.fn(),
    };
    const dropdown = {
      value: 'canvas-2d',
      closest: jest.fn(() => ({ id: 'post-id' })),
      parentNode: { querySelector: () => created },
    };
    const getData = jest.fn(() => ({
      output: {
        'post-id': JSON.stringify({
          width: 160,
          height: 120,
          shapes: [],
        }),
      },
    }));

    handleDropdownChange(dropdown, getData, dom);

    expect(dom.createElement).toHaveBeenCalledWith('div');
    expect(dom.createElement).toHaveBeenCalledWith('canvas');
    expect(dom.appendChild).toHaveBeenCalledWith(created, expect.any(Object));
  });
});
