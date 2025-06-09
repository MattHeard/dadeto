import { describe, test, expect } from '@jest/globals';
import { createTicTacToeBoardElement } from '../../src/presenters/ticTacToeBoard.js';

function mockDom() {
  return {
    createElement: tag => ({ tagName: tag, textContent: '' }),
    setTextContent: (el, txt) => {
      el.textContent = txt;
    },
  };
}

describe('createTicTacToeBoardElement invalid move handling', () => {
  test('ignores moves with invalid players', () => {
    const input = JSON.stringify({
      moves: [
        { player: 'Q', position: { row: 0, column: 0 } },
        { player: 'X', position: { row: 1, column: 1 } },
      ],
    });
    const el = createTicTacToeBoardElement(input, mockDom());
    expect(el.textContent).toBe(
      '   |   |   \n' +
      '---+---+---\n' +
      '   | X |   \n' +
      '---+---+---\n' +
      '   |   |   '
    );
  });
});
