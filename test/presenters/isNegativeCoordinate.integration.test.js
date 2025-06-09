import { describe, test, expect } from '@jest/globals';
import { createBattleshipFleetBoardElement } from '../../src/presenters/battleshipSolitaireFleet.js';

function makeDom() {
  return {
    createElement: tag => ({ tag, text: '' }),
    setTextContent: (el, text) => {
      el.text = text;
    },
  };
}

describe('isNegativeCoordinate integration', () => {
  test('horizontal ship with negative start x occupies only the second cell', () => {
    const dom = makeDom();
    const fleet = {
      width: 2,
      height: 1,
      ships: [{ start: { x: -1, y: 0 }, length: 2, direction: 'H' }],
    };
    const el = createBattleshipFleetBoardElement(JSON.stringify(fleet), dom);
    expect(el.text.trim()).toBe('# \u00B7');
  });

  test('vertical ship with negative start y occupies only the second cell', () => {
    const dom = makeDom();
    const fleet = {
      width: 1,
      height: 2,
      ships: [{ start: { x: 0, y: -1 }, length: 2, direction: 'V' }],
    };
    const el = createBattleshipFleetBoardElement(JSON.stringify(fleet), dom);
    expect(el.text.trim()).toBe('#\n\u00B7');
  });
});
