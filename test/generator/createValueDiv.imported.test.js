import { describe, test, expect } from '@jest/globals';
import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const filePath = require.resolve('../../src/generator/generator.js');

async function loadCreateValueDiv() {
  const code = readFileSync(filePath, 'utf8');
  const injectedPath = path.join(
    path.dirname(filePath),
    `__cvd_${process.pid}.js`
  );
  writeFileSync(
    injectedPath,
    `${code}\nexport { createValueDiv as __createValueDiv };`
  );
  const module = await import(injectedPath);
  unlinkSync(injectedPath);
  return module.__createValueDiv;
}

describe('createValueDiv imported', () => {
  test('filters out falsy class names when loaded via import', async () => {
    const createValueDiv = await loadCreateValueDiv();
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
