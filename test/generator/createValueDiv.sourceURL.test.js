import { describe, test, expect } from '@jest/globals';
import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const filePath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../src/generator/generator.js'
);

async function loadCreateValueDiv() {
  const code = readFileSync(filePath, 'utf8');
  const injectedPath = path.join(
    path.dirname(filePath),
    `__cvd_sourceurl_${process.pid}.js`
  );
  writeFileSync(
    injectedPath,
    `${code}\nexport { createValueDiv as __createValueDiv };\n//# sourceURL=${filePath}`
  );
  const url = pathToFileURL(injectedPath).toString();
  const module = await import(url + `?cacheBust=${Date.now()}`);
  unlinkSync(injectedPath);
  return module.__createValueDiv;
}

describe('createValueDiv with sourceURL', () => {
  test('filters out falsy class names', async () => {
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
