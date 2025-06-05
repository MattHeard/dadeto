import { describe, test, expect } from '@jest/globals';
import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const filePath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../src/generator/generator.js'
);

async function loadCreateValueDiv() {
  const code = readFileSync(filePath, 'utf8');
  const injectedPath = path.join(
    path.dirname(filePath),
    `__cvd_trailing_${process.pid}.js`
  );
  writeFileSync(
    injectedPath,
    `${code}\nexport { createValueDiv as __createValueDiv };`
  );
  const module = await import(injectedPath);
  unlinkSync(injectedPath);
  return module.__createValueDiv;
}

describe('createValueDiv trailing spaces', () => {
  test('does not introduce double spaces with many falsy classes', async () => {
    const createValueDiv = await loadCreateValueDiv();
    const result = createValueDiv('x', [
      'foo',
      '',
      null,
      undefined,
      false,
      'bar',
    ]);
    expect(result).toBe('<div class="value foo bar">x</div>');
  });
});
