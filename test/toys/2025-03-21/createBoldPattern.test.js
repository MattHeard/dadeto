import fs from 'fs';
import path from 'path';
import { beforeAll, describe, test, expect } from '@jest/globals';

import { rewriteRelativeImports } from '../../helpers/resolveRelativeImports.js';

let createBoldPattern;

beforeAll(async () => {
  const srcPath = path.join(
    process.cwd(),
    'src/core/browser/toys/2025-03-21/italics.js'
  );
  let src = fs.readFileSync(srcPath, 'utf8');
  src = rewriteRelativeImports(src, srcPath);
  src += '\nexport { createBoldPattern };';
  ({ createBoldPattern } = await import(
    `data:text/javascript,${encodeURIComponent(src)}`
  ));
});

describe('createBoldPattern', () => {
  test('matches bold text spanning multiple lines', () => {
    const regex = createBoldPattern();
    expect(regex.test('**bold\nitalic**')).toBe(true);
    expect(regex.flags.includes('s')).toBe(true);
  });
});
