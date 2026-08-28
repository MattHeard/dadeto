import fs from 'fs';
import path from 'path';
import { beforeAll, describe, test, expect } from '@jest/globals';
import { rewriteRelativeImports } from '../../helpers/resolveRelativeImports.js';

let isInvalidText;

beforeAll(async () => {
  const filePath = path.join(
    process.cwd(),
    'src/core/browser/toys/2025-03-21/italics.js'
  );
  let src = fs.readFileSync(filePath, 'utf8');
  src = rewriteRelativeImports(src, filePath);
  src += '\nexport { isInvalidText };';
  ({ isInvalidText } = await import(
    `data:text/javascript,${encodeURIComponent(src)}`
  ));
});

describe('isInvalidText', () => {
  test.each([
    [undefined, true],
    [null, true],
    ['   ', false],
    ['content', false],
  ])('given %p returns %p', (input, expected) => {
    expect(isInvalidText(input)).toBe(expected);
  });
});
