import { describe, test, expect } from '@jest/globals';
import { createBattleshipFleetBoardElement } from '../../src/presenters/battleshipSolitaireFleet.js';

describe('createBattleshipFleetBoardElement negative start coordinates', () => {
  test('skips cells with negative x and renders remaining cells', () => {
    const dom = {
      createElement: tag => ({ tag, text: '' }),
      setTextContent: (el, text) => {
        el.text = text;
      }
    };
    const fleet = { width: 2, height: 1, ships: [{ start: { x: -1, y: 0 }, length: 2, direction: 'H' }] };
    const input = JSON.stringify(fleet);
    const el = createBattleshipFleetBoardElement(input, dom);
    expect(el.tag).toBe('pre');
    expect(el.text.trim()).toBe('# \u00B7');
  });

  test('skips cells with negative y and renders remaining cells', () => {
    const dom = {
      createElement: tag => ({ tag, text: '' }),
      setTextContent: (el, text) => {
        el.text = text;
      }
    };
    const fleet = {
      width: 1,
      height: 2,
      ships: [{ start: { x: 0, y: -1 }, length: 2, direction: 'V' }]
    };
    const input = JSON.stringify(fleet);
    const el = createBattleshipFleetBoardElement(input, dom);
    expect(el.tag).toBe('pre');
    expect(el.text.trim()).toBe('#\n\u00B7');
  });
});
