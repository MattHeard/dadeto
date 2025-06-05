import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { createBattleshipFleetBoardElement } from '../../src/presenters/battleshipSolitaireFleet.js';

// Reuse DOM mock from existing tests
let dom;

beforeEach(() => {
  dom = {
    createElement: jest.fn(tag => ({
      tag,
      text: '',
      children: [],
      setText: function (t) {
        this.text = t;
      },
    })),
    setTextContent: jest.fn((el, text) => {
      el.text = text;
    }),
  };
});

describe('createBattleshipFleetBoardElement invalid length', () => {
  test('skips ships with non-number length', () => {
    const fleet = {
      width: 3,
      height: 3,
      ships: [
        { start: { x: 0, y: 0 }, length: '2', direction: 'H' },
        { start: { x: 1, y: 1 }, length: 2, direction: 'V' },
      ],
    };
    const input = JSON.stringify(fleet);
    const el = createBattleshipFleetBoardElement(input, dom);
    expect(el.tag).toBe('pre');
    const lines = el.text.trim().split('\n');
    expect(lines).toEqual(['· · ·', '· # ·', '· # ·']);
  });
});
