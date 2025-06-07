import { describe, test, expect } from '@jest/globals';
import { createBattleshipCluesBoardElement } from '../../src/presenters/battleshipSolitaireClues.js';

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

function expectEmptyBoard(el) {
  expect(el.tag).toBe('pre');
  const lines = el.text.trim().split('\n');
  const gridLines = lines.filter(line => /^\s*0(\s+·){10}\s+0\s*$/.test(line));
  expect(gridLines.length).toBe(10);
}

describe('validateCluesObject via public API', () => {
  test('returns empty board when JSON is not an object', () => {
    const dom = makeDom();
    const el = createBattleshipCluesBoardElement('42', dom);
    expectEmptyBoard(el);
  });

  test('renders empty board when rowClues or colClues arrays are missing', () => {
    const dom = makeDom();
    const bad = JSON.stringify({ rowClues: [1, 2, 3] });
    const el = createBattleshipCluesBoardElement(bad, dom);
    expectEmptyBoard(el);
  });

  test('renders empty board when clue values are non-numeric', () => {
    const dom = makeDom();
    const bad = JSON.stringify({ rowClues: [1, 'x'], colClues: [2, 3] });
    const el = createBattleshipCluesBoardElement(bad, dom);
    expectEmptyBoard(el);
  });

  test('renders empty board when any array is empty', () => {
    const dom = makeDom();
    const bad = JSON.stringify({ rowClues: [], colClues: [] });
    const el = createBattleshipCluesBoardElement(bad, dom);
    expectEmptyBoard(el);
  });
});
