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

import { createBattleshipCluesBoardElement }
  from '../../src/presenters/battleshipSolitaireClues.js';

/* ---------- simple DOM stub ---------- */
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
  test('returns <p> “Invalid JSON” on parse failure', () => {
    const dom = makeDom();
    const el = createBattleshipCluesBoardElement('not json', dom);
    expect(el.tag).toBe('p');
    expect(el.text).toMatch(/Invalid JSON/);
  });

  test('returns <p> “Invalid JSON object” when JSON is not an object', () => {
    const dom = makeDom();
    const el = createBattleshipCluesBoardElement('123', dom); // number, not object
    expect(el.text).toMatch(/Invalid JSON object/);
  });

  test('returns <p> when rowClues / colClues arrays are missing', () => {
    const dom = makeDom();
    const bad = JSON.stringify({ rowClues: [1, 2, 3] });
    const el = createBattleshipCluesBoardElement(bad, dom);
    expect(el.text).toMatch(/Missing rowClues or colClues/);
  });

  test('returns <p> when clue values are non‑numeric', () => {
    const dom = makeDom();
    const bad = JSON.stringify({ rowClues: [1, 'x'], colClues: [2, 3] });
    const el = createBattleshipCluesBoardElement(bad, dom);
    expect(el.text).toMatch(/Clue values must be numbers/);
  });

  test('returns <p> when any array is empty', () => {
    const dom = makeDom();
    const bad = JSON.stringify({ rowClues: [], colClues: [1] });
    const el = createBattleshipCluesBoardElement(bad, dom);
    expect(el.text).toMatch(/non‑empty/);
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

    // row clue padding width = 2  (because '12' is widest)
    // Row lines should start with left clue and end with right clue
    expect(lines[2].startsWith(' 5')).toBe(true);
    expect(lines[2].endsWith(' 5')).toBe(true);

    expect(lines[3].startsWith('12')).toBe(true);
    expect(lines[3].endsWith('12')).toBe(true);

    // check column clue stacking: ones digits should be in last top‑clue line
    const topOnesLine = lines[1]; // second of top two clue lines
    expect(topOnesLine.trim()).toBe('1 9 1 2');
  });
});