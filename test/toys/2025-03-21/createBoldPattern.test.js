import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { beforeAll, describe, test, expect } from '@jest/globals';

let createBoldPattern;

beforeAll(async () => {
  const srcPath = path.join(
    process.cwd(),
    'src/core/toys/2025-03-21/italics.js'
  );
  let src = fs.readFileSync(srcPath, 'utf8');
  src = src.replace(/from '\.\/(.*?)'/g, (_, p) => {
    const abs = pathToFileURL(path.join(path.dirname(srcPath), p));
    return `from '${abs.href}'`;
  });
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
