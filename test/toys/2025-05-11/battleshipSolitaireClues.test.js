// Tests for Battleship Solitaire Clue Generator
// Created: 2025-05-11

import { generateClues } from '../../../src/toys/2025-05-11/battleshipSolitaireClues.js';

describe('generateClues', () => {
  it('returns an error for invalid JSON', () => {
    const output = JSON.parse(generateClues('not json'));
    expect(output).toHaveProperty('error');
  });

  it('returns an error for an invalid fleet structure', () => {
    const badFleet = JSON.stringify({ width: '5', height: 5, ships: [] });
    const output = JSON.parse(generateClues(badFleet));
    expect(output).toHaveProperty('error');
  });

  it('computes correct clues for a single horizontal ship', () => {
    const fleet = {
      width: 5,
      height: 5,
      ships: [
        { start: { x: 1, y: 2 }, length: 3, direction: 'H' } // cells (1,2), (2,2), (3,2)
      ]
    };
    const expectedRow = [0, 0, 3, 0, 0];
    const expectedCol = [0, 1, 1, 1, 0];

    const output = JSON.parse(generateClues(JSON.stringify(fleet)));
    expect(output.rowClues).toEqual(expectedRow);
    expect(output.colClues).toEqual(expectedCol);
  });

  it('computes correct clues for mixed horizontal and vertical ships', () => {
    const fleet = {
      width: 4,
      height: 4,
      ships: [
        { start: { x: 0, y: 0 }, length: 4, direction: 'V' }, // (0,0)–(0,3)
        { start: { x: 1, y: 1 }, length: 2, direction: 'H' } // (1,1), (2,1)
      ]
    };
    const expectedRow = [1, 3, 1, 1]; // rows 0–3
    const expectedCol = [4, 1, 1, 0]; // cols 0–3

    const output = JSON.parse(generateClues(JSON.stringify(fleet)));
    expect(output.rowClues).toEqual(expectedRow);
    expect(output.colClues).toEqual(expectedCol);
  });

  it('ignores ship cells that fall outside the board', () => {
    const fleet = {
      width: 3,
      height: 3,
      ships: [
        { start: { x: 2, y: 2 }, length: 2, direction: 'H' } // (2,2) in, (3,2) out
      ]
    };
    const expectedRow = [0, 0, 1];
    const expectedCol = [0, 0, 1];

    const output = JSON.parse(generateClues(JSON.stringify(fleet)));
    expect(output.rowClues).toEqual(expectedRow);
    expect(output.colClues).toEqual(expectedCol);
  });
});
