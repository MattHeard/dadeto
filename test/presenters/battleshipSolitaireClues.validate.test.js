import fs from 'fs/promises';
import vm from 'vm';
import { pathToFileURL } from 'url';
import { describe, test, expect } from '@jest/globals';
import { createBattleshipCluesBoardElement } from '../../src/presenters/battleshipSolitaireClues.js';

async function loadValidateCluesObject() {
  const url = pathToFileURL('./src/presenters/battleshipSolitaireClues.js');
  let code = await fs.readFile(url, 'utf8');
  code += '\nglobalThis.__validateCluesObject = validateCluesObject;';
  const context = vm.createContext({ globalThis });
  const mod = new vm.SourceTextModule(code, {
    identifier: url.href,
    context,
  });
  await mod.link(async () => {});
  await mod.evaluate();
  return context.globalThis.__validateCluesObject;
}

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

  test('returns error when rowClues or colClues arrays are missing', async () => {
    const validateCluesObject = await loadValidateCluesObject();
    const result = validateCluesObject({ rowClues: [1, 2, 3] });
    expect(result).toBe('Missing rowClues or colClues array');
  });

  test('returns error when clue values are non-numeric', async () => {
    const validateCluesObject = await loadValidateCluesObject();
    const result = validateCluesObject({
      rowClues: [1, 'x'],
      colClues: [2, 3],
    });
    expect(result).toBe('Clue values must be numbers');
  });

  test('returns error when any array is empty', async () => {
    const validateCluesObject = await loadValidateCluesObject();
    const result = validateCluesObject({ rowClues: [], colClues: [] });
    expect(result).toBe('rowClues and colClues must be non-empty');
  });
});
