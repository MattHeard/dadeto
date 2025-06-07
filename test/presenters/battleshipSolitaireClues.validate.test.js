import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { beforeAll, describe, test, expect } from '@jest/globals';
import { createBattleshipCluesBoardElement } from '../../src/presenters/battleshipSolitaireClues.js';

let validateCluesObject;

beforeAll(async () => {
  const presenterPath = path.join(
    process.cwd(),
    'src/presenters/battleshipSolitaireClues.js'
  );
  let src = fs.readFileSync(presenterPath, 'utf8');
  src = src.replace(/from '\.\/(.*?)'/g, (_, p) => {
    const absolute = pathToFileURL(path.join(path.dirname(presenterPath), p));
    return `from '${absolute.href}'`;
  });
  src += '\nexport { validateCluesObject };';
  ({ validateCluesObject } = await import(
    `data:text/javascript,${encodeURIComponent(src)}`
  ));
});

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

  test('returns error when rowClues or colClues arrays are missing', () => {
    const result = validateCluesObject({ rowClues: [1, 2, 3] });
    expect(result).toBe('Missing rowClues or colClues array');
  });

  test('returns error when clue values are non-numeric', () => {
    const result = validateCluesObject({ rowClues: [1, 'x'], colClues: [2, 3] });
    expect(result).toBe('Clue values must be numbers');
  });

  test('returns error when any array is empty', () => {
    const result = validateCluesObject({ rowClues: [], colClues: [] });
    expect(result).toBe('rowClues and colClues must be non-empty');
  });
});
