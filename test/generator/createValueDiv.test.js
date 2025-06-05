import { describe, test, expect } from '@jest/globals';
import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import {
  createAttrPair,
  createTag,
  ATTR_NAME,
} from '../../src/generator/html.js';

const filePath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../src/generator/generator.js'
);

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
    return createValueDiv;`;
  return new Function('createAttrPair', 'createTag', 'ATTR_NAME', functionCode)(
    createAttrPair,
    createTag,
    ATTR_NAME
  );
}

async function importCreateValueDiv() {
  const code = readFileSync(filePath, 'utf8');
  const tempPath = path.join(
    path.dirname(filePath),
    `tmp-create-value-div-${process.pid}.mjs`
  );
  writeFileSync(
    tempPath,
    `${code}\nexport { createValueDiv as __createValueDiv__ };`
  );
  const moduleUrl = pathToFileURL(tempPath).href;
  const mod = await import(moduleUrl);
  unlinkSync(tempPath);
  return mod.__createValueDiv__;
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

  test('module import filters out falsy class names', async () => {
    const createValueDiv = await importCreateValueDiv();
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
