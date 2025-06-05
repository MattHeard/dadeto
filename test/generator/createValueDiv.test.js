import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createAttrPair, createTag, ATTR_NAME } from '../../src/generator/html.js';

const filePath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../src/generator/generator.js'
);

function getCreateValueDiv() {
  const code = readFileSync(filePath, 'utf8');
  const match = code.match(/const CLASS[^]*?function createValueDiv\([^]*?\n\}/);
  if (!match) {
    throw new Error('createValueDiv not found');
  }
  return new Function('createAttrPair', 'createTag', 'ATTR_NAME', `${match[0]}; return createValueDiv;`)(
    createAttrPair,
    createTag,
    ATTR_NAME
  );
}

describe('createValueDiv', () => {
  test('filters out falsy class names', () => {
    const createValueDiv = getCreateValueDiv();
    const result = createValueDiv('content', ['foo', '', undefined, null, 'bar']);
    expect(result).toBe('<div class="value foo bar">content</div>');
  });
});
