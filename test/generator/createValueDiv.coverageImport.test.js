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
    `__cvd_import_${process.pid}.mjs`
  );
  writeFileSync(
    injectedPath,
    `${code}\nexport { createValueDiv as __createValueDiv };\n//# sourceURL=${filePath}`
  );
  const module = await import(`${injectedPath}?v=${Date.now()}`);
  unlinkSync(injectedPath);
  return module.__createValueDiv;
}

describe('createValueDiv imported with coverage', () => {
  test('filters out falsy class names via import', async () => {
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

  test('handles all falsy additional classes', async () => {
    const createValueDiv = await loadCreateValueDiv();
    const result = createValueDiv('text', ['', false, undefined, null, 0]);
    expect(result).toBe('<div class="value">text</div>');
  });
});
