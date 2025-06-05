import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import {
  createAttrPair,
  createTag,
  ATTR_NAME,
} from '../../src/generator/html.js';

const require = createRequire(import.meta.url);
const filePath = require.resolve('../../src/generator/generator.js');

function getCreateValueDiv() {
  const code = readFileSync(filePath, 'utf8');
  const match = code.match(/function createValueDiv\([^]*?\n\}/);
  if (!match) {
    throw new Error('createValueDiv not found');
  }
  const helperCode = `
    const CLASS = {
      KEY: 'key',
      VALUE: 'value',
      ENTRY: 'entry',
      ARTICLE_TITLE: 'article-title',
      METADATA: 'metadata',
      FOOTER: 'footer',
      WARNING: 'warning',
      MEDIA: 'media',
      FULL_WIDTH: 'full-width',
    };
    function joinClasses(classes) { return classes.join(' '); }
    function createDiv(classes, content) {
      const classAttr = createAttrPair(ATTR_NAME.CLASS, classes);
      return createTag('div', classAttr, content);
    }
  `;
  const functionCode = `${helperCode}
    ${match[0]};
    return createValueDiv;\n//# sourceURL=${filePath}`;
  return new Function('createAttrPair', 'createTag', 'ATTR_NAME', functionCode)(
    createAttrPair,
    createTag,
    ATTR_NAME
  );
}

describe('createValueDiv', () => {
  test('filters out falsy class names', () => {
    const createValueDiv = getCreateValueDiv();
    const result = createValueDiv('content', [
      'foo',
      '',
      undefined,
      null,
      'bar',
    ]);
    expect(result).toBe('<div class="value foo bar">content</div>');
  });

  test('returns base class when all additional classes are falsy', () => {
    const createValueDiv = getCreateValueDiv();
    const result = createValueDiv('text', ['', false, undefined, null, 0]);
    expect(result).toBe('<div class="value">text</div>');
  });
});
