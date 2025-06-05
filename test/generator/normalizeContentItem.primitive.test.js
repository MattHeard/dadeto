import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const filePath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../src/generator/generator.js'
);

function loadFunctions() {
  const code = readFileSync(filePath, 'utf8');
  const rules = code.match(/const normalizationRules = [^]*?];/);
  const getNormalizer = code.match(/function getContentNormalizer[^]*?\n\}/);
  const normalize = code.match(/function normalizeContentItem[^]*?\n\}/);
  if (!rules || !getNormalizer || !normalize) {
    throw new Error('required code not found');
  }
  const fnCode = `${rules[0]}
${getNormalizer[0]}
${normalize[0]}
return { getContentNormalizer, normalizeContentItem };`;
  return new Function(fnCode)();
}

describe('normalizeContentItem primitive handling', () => {
  test('wraps primitives and null as text objects', () => {
    const { normalizeContentItem } = loadFunctions();
    expect(normalizeContentItem('a')).toEqual({ type: 'text', content: 'a' });
    expect(normalizeContentItem(null)).toEqual({ type: 'text', content: null });
    expect(normalizeContentItem(5)).toEqual({ type: 'text', content: 5 });
  });

  test('leaves objects unchanged', () => {
    const { normalizeContentItem } = loadFunctions();
    const obj = { type: 'quote', content: 'hi' };
    expect(normalizeContentItem(obj)).toBe(obj);
  });
});
