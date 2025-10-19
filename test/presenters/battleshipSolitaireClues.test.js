// tests for battleshipSolitaireClues presenter
// (add real tests in future)

describe('battleshipSolitaireClues presenter', () => {
  it('should be implemented', () => {
    // placeholder
  });
});

/* eslint-env jest */
/**
 * Unit‑tests for createBattleshipCluesBoardElement presenter
 * Aim: 100 % branch coverage
 */

import { createBattleshipCluesBoardElement } from '../../src/core/presenters/battleshipSolitaireClues.js';

/* ---------- simple DOM stub ---------- */
/**
 * Creates a minimal DOM API used for testing.
 * @returns {object} Stub DOM implementation.
 */
function makeDom() {
  return {
    created: [],
    createElement(tag) {
      const el = { tag, text: '' };
      this.created.push(el);
      return el;
    },
    setTextContent(el, text) {
      el.text = text;
    },
  };
}

describe('createBattleshipCluesBoardElement – error handling', () => {
  /**
   * Asserts that a grid element represents an empty 10x10 board.
   * @param {object} el - DOM element created by the presenter.
   * @returns {void}
   */
  function expectEmpty10x10Board(el) {
    expect(el.tag).toBe('pre');
    const lines = el.text.trim().split('\n');
    // Find grid lines (should be 10 of them, each with 10 dots and 0 clue)
    const gridLines = lines.filter(line =>
      /^\s*0(\s+·){10}\s+0\s*$/.test(line)
    );
    expect(gridLines.length).toBe(10);
    for (const line of gridLines) {
      // Remove spaces, should be '0··········0'
      expect(line.replace(/\s/g, '')).toBe('0··········0');
    }
  }

  test('renders 10x10 empty board on parse failure', () => {
    const dom = makeDom();
    const el = createBattleshipCluesBoardElement('not json', dom);
    expectEmpty10x10Board(el);
  });

  test('renders 10x10 empty board when JSON is not an object', () => {
    const dom = makeDom();
    const el = createBattleshipCluesBoardElement('123', dom); // number, not object
    expectEmpty10x10Board(el);
  });

  test('renders 10x10 empty board when JSON is a string', () => {
    const dom = makeDom();
    const input = '"foo"';
    const el = createBattleshipCluesBoardElement(input, dom);
    expectEmpty10x10Board(el);
  });

  test('renders 10x10 empty board when JSON is null', () => {
    const dom = makeDom();
    const el = createBattleshipCluesBoardElement('null', dom); // null value
    expectEmpty10x10Board(el);
  });

  test('renders 10x10 empty board when rowClues / colClues arrays are missing', () => {
    const dom = makeDom();
    const bad = JSON.stringify({ rowClues: [1, 2, 3] });
    const el = createBattleshipCluesBoardElement(bad, dom);
    expectEmpty10x10Board(el);
  });

  test('renders 10x10 empty board when clue values are non‑numeric', () => {
    const dom = makeDom();
    const bad = JSON.stringify({ rowClues: [1, 'x'], colClues: [2, 3] });
    const el = createBattleshipCluesBoardElement(bad, dom);
    expectEmpty10x10Board(el);
  });

  test('renders 10x10 empty board when column clue values are non‑numeric', () => {
    const dom = makeDom();
    const bad = JSON.stringify({ rowClues: [1, 2], colClues: [3, 'x'] });
    const el = createBattleshipCluesBoardElement(bad, dom);
    expectEmpty10x10Board(el);
  });

  test('renders 10x10 empty board when any array is empty', () => {
    const dom = makeDom();
    const bad = JSON.stringify({ rowClues: [], colClues: [1] });
    const el = createBattleshipCluesBoardElement(bad, dom);
    expectEmpty10x10Board(el);
  });

  test('renders 10x10 empty board when column clues array is empty', () => {
    const dom = makeDom();
    const bad = JSON.stringify({ rowClues: [1], colClues: [] });
    const el = createBattleshipCluesBoardElement(bad, dom);
    expectEmpty10x10Board(el);
  });
});

describe('createBattleshipCluesBoardElement – successful render', () => {
  test('renders padded multi‑digit row clues and stacked column clues', () => {
    const input = {
      rowClues: [5, 12, 3],
      colClues: [1, 9, 11, 2],
    };
    const dom = makeDom();
    const el = createBattleshipCluesBoardElement(JSON.stringify(input), dom);

    // should return a <pre>
    expect(el.tag).toBe('pre');

    const lines = el.text.split('\n');

    // column clues: maxDigits = 2 → 2 top + grid(3) + 2 bottom = 7 lines
    expect(lines.length).toBe(7);

    // check top column clues tens digit line
    const topTensLine = lines[0];
    expect(topTensLine).toBe('       1     ');

    // row clue padding width = 2  (because '12' is widest)
    // Row lines should start with left clue and end with right clue
    expect(lines[2].startsWith(' 5')).toBe(true);
    expect(lines[2].endsWith(' 5')).toBe(true);

    expect(lines[3].startsWith('12')).toBe(true);
    expect(lines[3].endsWith('12')).toBe(true);

    // check column clue stacking: ones digits should be in last top‑clue line
    const topOnesLine = lines[1]; // second of top two clue lines
    expect(topOnesLine.trim()).toBe('1 9 1 2');

    // ensure tens digits line preserves spaces for single‑digit clues
    // const topTensLine = lines[0]; // This was the redundant declaration
    expect(topTensLine).toBe('       1     ');
  });
});
