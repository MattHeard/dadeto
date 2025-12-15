import fs from 'fs';
import path from 'path';
import { beforeAll, describe, expect, test } from '@jest/globals';
import { rewriteRelativeImports } from '../../helpers/resolveRelativeImports.js';

let createBoldPatternPart;
let createItalicsPattern;

beforeAll(async () => {
  const srcPath = path.join(
    process.cwd(),
    'src/core/browser/toys/2025-03-21/italics.js'
  );
  let src = fs.readFileSync(srcPath, 'utf8');
  src = rewriteRelativeImports(src, srcPath);
  src += '\nexport { createBoldPatternPart, createItalicsPattern };';
  ({ createBoldPatternPart, createItalicsPattern } = await import(
    `data:text/javascript,${encodeURIComponent(src)}`
  ));
});

describe('regex escaping for italics helpers', () => {
  test('createBoldPatternPart escapes special characters', () => {
    const part = createBoldPatternPart('$');
    expect(part).toBe('(?:\\$\\$.*?\\$\\$)');
    expect(new RegExp(part).test('$$bold$$')).toBe(true);
  });

  test('createItalicsPattern escapes special characters', () => {
    const regex = createItalicsPattern('$');
    expect(regex.source).toBe('\\$(.*?)\\$');
    expect('foo $bar$ baz'.replace(regex, 'X')).toBe('foo X baz');
  });

  test('createBoldPatternPart leaves non-special characters unescaped', () => {
    const part = createBoldPatternPart('_');
    expect(part).toBe('(?:__.*?__)');
    expect(new RegExp(part).test('__bold__')).toBe(true);
  });

  test('createItalicsPattern leaves non-special characters unescaped', () => {
    const regex = createItalicsPattern('_');
    expect(regex.source).toBe('_(.*?)_');
    expect('foo _bar_ baz'.replace(regex, 'X')).toBe('foo X baz');
  });
});
