import { describe, it, expect, jest } from '@jest/globals';
import { handleDropdownChange } from '../../src/browser/toys.js';

describe('setTextContent via handleDropdownChange graph-2d', () => {
  it('uses the graph presenter for "graph-2d" output', () => {
    const created = {};
    const context = {
      fillRect: jest.fn(),
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      stroke: jest.fn(),
      set fillStyle(value) {
        this._fillStyle = value;
      },
      set strokeStyle(value) {
        this._strokeStyle = value;
      },
      set lineWidth(value) {
        this._lineWidth = value;
      },
    };
    const dom = {
      querySelector: jest.fn(() => created),
      removeAllChildren: jest.fn(),
      appendChild: jest.fn(),
      createElement: jest.fn(tag =>
        tag === 'canvas'
          ? {
              width: 0,
              height: 0,
              getContext: jest.fn(() => context),
            }
          : { tagName: tag.toUpperCase() }
      ),
      setClassName: jest.fn(),
    };
    const dropdown = {
      value: 'graph-2d',
      closest: jest.fn(() => ({ id: 'post-id' })),
      parentNode: { querySelector: () => created },
    };
    const getData = jest.fn(() => ({
      output: {
        'post-id': JSON.stringify({
          expression: 'x',
          width: 160,
          height: 120,
          xMin: -1,
          xMax: 1,
          yMin: -1,
          yMax: 1,
        }),
      },
    }));

    handleDropdownChange(dropdown, getData, dom);

    expect(dom.createElement).toHaveBeenCalledWith('div');
    expect(dom.createElement).toHaveBeenCalledWith('canvas');
    expect(dom.appendChild).toHaveBeenCalledWith(created, expect.any(Object));
  });
});
