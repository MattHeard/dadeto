import { createTicTacToeBoardElement } from '../../src/presenters/ticTacToeBoard.js';

/**
 * Very small stub of the DOM abstraction used in tests
 *
 * @returns {object} mocked DOM helpers
 */
function mockDom() {
  return {
    createElement: tag => ({ tagName: tag, textContent: '' }),
    setTextContent: (el, txt) => {
      el.textContent = txt;
    },
  };
}

describe('createTicTacToeBoardElement', () => {
  it('renders an empty board if moves property is missing', () => {
    const el = createTicTacToeBoardElement(JSON.stringify({}), mockDom());
    expect(el.textContent).toBe(
      '   |   |   \n' +
        '---+---+---\n' +
        '   |   |   \n' +
        '---+---+---\n' +
        '   |   |   '
    );
  });

  it('renders an empty board if moves is not an array', () => {
    const el = createTicTacToeBoardElement(
      JSON.stringify({ moves: 5 }),
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

  it('ignores moves with invalid player', () => {
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

  it('ignores moves with missing position', () => {
    const input = JSON.stringify({
      moves: [
        { player: 'X' },
        { player: 'O', position: { row: 1, column: 1 } },
      ],
    });
    const el = createTicTacToeBoardElement(input, mockDom());
    expect(el.textContent).toBe(
      '   |   |   \n' +
        '---+---+---\n' +
        '   | O |   \n' +
        '---+---+---\n' +
        '   |   |   '
    );
  });

  it('ignores moves with out-of-bounds position', () => {
    const input = JSON.stringify({
      moves: [
        { player: 'X', position: { row: 3, column: 0 } },
        { player: 'O', position: { row: 1, column: 1 } },
      ],
    });
    const el = createTicTacToeBoardElement(input, mockDom());
    expect(el.textContent).toBe(
      '   |   |   \n' +
        '---+---+---\n' +
        '   | O |   \n' +
        '---+---+---\n' +
        '   |   |   '
    );
  });

  it('ignores moves with out-of-bounds column', () => {
    const input = JSON.stringify({
      moves: [
        { player: 'X', position: { row: 0, column: 3 } },
        { player: 'O', position: { row: 1, column: 1 } },
      ],
    });
    const el = createTicTacToeBoardElement(input, mockDom());
    expect(el.textContent).toBe(
      '   |   |   \n' +
        '---+---+---\n' +
        '   | O |   \n' +
        '---+---+---\n' +
        '   |   |   '
    );
  });

  it('only applies the first move to a cell (overlapping moves)', () => {
    const input = JSON.stringify({
      moves: [
        { player: 'X', position: { row: 0, column: 0 } },
        { player: 'O', position: { row: 0, column: 0 } },
        { player: 'X', position: { row: 0, column: 0 } },
      ],
    });
    const el = createTicTacToeBoardElement(input, mockDom());
    expect(el.textContent).toBe(
      ' X |   |   \n' +
        '---+---+---\n' +
        '   |   |   \n' +
        '---+---+---\n' +
        '   |   |   '
    );
  });

  it('ignores a second move to an occupied cell', () => {
    const input = JSON.stringify({
      moves: [
        { player: 'X', position: { row: 0, column: 0 } },
        { player: 'O', position: { row: 0, column: 0 } },
      ],
    });
    const el = createTicTacToeBoardElement(input, mockDom());
    expect(el.textContent).toBe(
      ' X |   |   \n' +
        '---+---+---\n' +
        '   |   |   \n' +
        '---+---+---\n' +
        '   |   |   '
    );
  });

  it('ignores moves with missing row/column', () => {
    const input = JSON.stringify({
      moves: [
        { player: 'X', position: { row: 0 } },
        { player: 'O', position: { column: 1 } },
      ],
    });
    const el = createTicTacToeBoardElement(input, mockDom());
    expect(el.textContent).toBe(
      '   |   |   \n' +
        '---+---+---\n' +
        '   |   |   \n' +
        '---+---+---\n' +
        '   |   |   '
    );
  });

  it('ignores moves where row or column are not numbers', () => {
    const input = JSON.stringify({
      moves: [
        { player: 'X', position: { row: '0', column: 0 } },
        { player: 'O', position: { row: 1, column: '1' } },
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

  it('ignores moves where the move is not an object (null, number, string, array)', () => {
    const input = JSON.stringify({
      moves: [
        null,
        42,
        'foo',
        [1, 2, 3],
        { player: 'X', position: { row: 0, column: 0 } },
      ],
    });
    const el = createTicTacToeBoardElement(input, mockDom());
    expect(el.textContent).toBe(
      ' X |   |   \n' +
        '---+---+---\n' +
        '   |   |   \n' +
        '---+---+---\n' +
        '   |   |   '
    );
  });

  it('ignores moves where position is null, number, string, or array', () => {
    const input = JSON.stringify({
      moves: [
        { player: 'X', position: null },
        { player: 'O', position: 123 },
        { player: 'X', position: 'abc' },
        { player: 'O', position: [1, 2] },
        { player: 'X', position: { row: 2, column: 2 } },
      ],
    });
    const el = createTicTacToeBoardElement(input, mockDom());
    expect(el.textContent).toBe(
      '   |   |   \n' +
        '---+---+---\n' +
        '   |   |   \n' +
        '---+---+---\n' +
        '   |   | X '
    );
  });

  it('ignores moves with non-numeric column values', () => {
    const input = JSON.stringify({
      moves: [
        { player: 'X', position: { row: 1, column: '2' } },
        { player: 'O', position: { row: 1, column: 1 } },
      ],
    });
    const el = createTicTacToeBoardElement(input, mockDom());
    expect(el.textContent).toBe(
      '   |   |   \n' +
        '---+---+---\n' +
        '   | O |   \n' +
        '---+---+---\n' +
        '   |   |   '
    );
  });

  it('ignores moves with negative row or column', () => {
    const input = JSON.stringify({
      moves: [
        { player: 'X', position: { row: -1, column: 0 } },
        { player: 'O', position: { row: 0, column: -1 } },
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

  it('renders an empty board for empty string input', () => {
    const el = createTicTacToeBoardElement('', mockDom());
    expect(el.tagName).toBe('pre');
    expect(el.textContent).toBe(
      '   |   |   \n' +
        '---+---+---\n' +
        '   |   |   \n' +
        '---+---+---\n' +
        '   |   |   '
    );
  });

  it('renders an empty board for valid JSON but not an object', () => {
    const el = createTicTacToeBoardElement('42', mockDom());
    expect(el.tagName).toBe('pre');
    expect(el.textContent).toBe(
      '   |   |   \n' +
        '---+---+---\n' +
        '   |   |   \n' +
        '---+---+---\n' +
        '   |   |   '
    );
  });

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

  it('renders an empty board for invalid JSON', () => {
    const el = createTicTacToeBoardElement('not-json', mockDom());
    expect(el.tagName).toBe('pre');
    expect(el.textContent).toBe(
      '   |   |   \n' +
        '---+---+---\n' +
        '   |   |   \n' +
        '---+---+---\n' +
        '   |   |   '
    );
  });

  it('renders an empty board when the only move has an invalid player', () => {
    const input = JSON.stringify({
      moves: [{ player: 'Q', position: { row: 0, column: 0 } }],
    });
    const el = createTicTacToeBoardElement(input, mockDom());
    expect(el.textContent).toBe(
      '   |   |   \n' +
        '---+---+---\n' +
        '   |   |   \n' +
        '---+---+---\n' +
        '   |   |   '
    );
  });

  it('ignores multiple moves with invalid players', () => {
    const input = JSON.stringify({
      moves: [
        { player: 'Q', position: { row: 0, column: 0 } },
        { player: 'P', position: { row: 2, column: 2 } },
      ],
    });
    const el = createTicTacToeBoardElement(input, mockDom());
    expect(el.textContent).toBe(
      '   |   |   \n' +
        '---+---+---\n' +
        '   |   |   \n' +
        '---+---+---\n' +
        '   |   |   '
    );
  });
});
