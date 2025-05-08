import { createTicTacToeBoardElement } from '../../src/presenters/ticTacToeBoard.js';

/** Very small stub of the DOM abstraction used in tests */
function mockDom() {
  return {
    createElement: tag => ({ tagName: tag, textContent: '' }),
    setTextContent: (el, txt) => { el.textContent = txt; },
  };
}

describe('createTicTacToeBoardElement', () => {
  it('renders a board with three moves', () => {
    const input = JSON.stringify({
      moves: [
        { player: 'X', position: { row: 0, column: 0 } },
        { player: 'O', position: { row: 1, column: 1 } },
        { player: 'X', position: { row: 2, column: 2 } },
      ],
    });
    const el = createTicTacToeBoardElement(input, mockDom());

    expect(el.tagName).toBe('pre');
    expect(el.textContent).toBe(
      ' X |   |   \n' +
      '---+---+---\n' +
      '   | O |   \n' +
      '---+---+---\n' +
      '   |   | X '
    );
  });

  it('renders an empty board when there are no moves', () => {
    const el = createTicTacToeBoardElement(
      JSON.stringify({ moves: [] }),
      mockDom()
    );

    expect(el.textContent).toBe(
      '   |   |   \n' +
      '---+---+---\n' +
      '   |   |   \n' +
      '---+---+---\n' +
      '   |   |   '
    );
  });

  it('gracefully reports invalid JSON', () => {
    const el = createTicTacToeBoardElement('not-json', mockDom());

    expect(el.tagName).toBe('p');
    expect(el.textContent).toBe('Invalid JSON');
  });
});