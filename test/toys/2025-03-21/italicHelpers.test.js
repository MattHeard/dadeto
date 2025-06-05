import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const filePath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../src/toys/2025-03-21/italics.js'
);

function getHelpers() {
  const code = readFileSync(filePath, 'utf8');
  const beforeMatch = code.match(/function processItalicBefore[^]*?\n\}/);
  const afterMatch = code.match(/function processBoldAfter[^]*?\n\}/);
  if (!beforeMatch || !afterMatch) {
    throw new Error('helper functions not found');
  }
  const stub = `
    function processAllItalicStyles() { throw new Error('should not be called'); }
    function processTextPreservingBold() { throw new Error('should not be called'); }
  `;
  const functionCode = `${stub}
    ${beforeMatch[0]}
    ${afterMatch[0]}
    return { processItalicBefore, processBoldAfter };`;
  return new Function(functionCode)();
}

describe('italic helper functions', () => {
  test('processItalicBefore returns empty string for falsy input', () => {
    const { processItalicBefore } = getHelpers();
    expect(processItalicBefore('')).toBe('');
    expect(processItalicBefore(undefined)).toBe('');
  });

  test('processBoldAfter returns empty string for falsy input', () => {
    const { processBoldAfter } = getHelpers();
    expect(processBoldAfter('')).toBe('');
    expect(processBoldAfter(undefined)).toBe('');
  });
});
