import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { compileFunction } from 'vm';
import {
  createAttrPair,
  createTag,
  ATTR_NAME,
} from '../../src/generator/html.js';

const filePath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../src/generator/generator.js'
);

function loadCreateValueDivViaVm() {
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
  const fn = compileFunction(
    `${helperCode}
    ${match[0]};
    return createValueDiv;`,
    ['createAttrPair', 'createTag', 'ATTR_NAME'],
    { filename: filePath }
  );
  return fn(createAttrPair, createTag, ATTR_NAME);
}

describe('createValueDiv via vm.compileFunction', () => {
  test('filters out falsy class names', () => {
    const createValueDiv = loadCreateValueDivViaVm();
    const result = createValueDiv('content', [
      'foo',
      '',
      undefined,
      null,
      'bar',
    ]);
    expect(result).toBe('<div class="value foo bar">content</div>');
  });
});
