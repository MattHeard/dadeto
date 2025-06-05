import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { escapeHtml } from '../../src/generator/html.js';

const filePath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../src/generator/generator.js'
);

function getEscapeRelatedLinkFields() {
  const code = readFileSync(filePath, 'utf8');
  const match = code.match(/function escapeRelatedLinkFields\([^]*?\n\}/);
  if (!match) {
    throw new Error('escapeRelatedLinkFields not found');
  }
  const functionCode = `${match[0]}; return escapeRelatedLinkFields;`;
  // Pass escapeHtml as a dependency
  return new Function('escapeHtml', functionCode)(escapeHtml);
}

describe('escapeRelatedLinkFields', () => {
  test('fills missing fields with empty strings and escapes HTML', () => {
    const escapeRelatedLinkFields = getEscapeRelatedLinkFields();
    const link = { url: '<a>', title: '<b>', type: 'article' };
    const result = escapeRelatedLinkFields(link);
    expect(result.url).toBe('&lt;a&gt;');
    expect(result.title).toBe('&lt;b&gt;');
    expect(result.author).toBe('');
    expect(result.source).toBe('');
    expect(result.quote).toBe('');
    expect(result.type).toBe('article');
  });
});
