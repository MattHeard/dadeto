import { describe, test, expect, beforeAll } from '@jest/globals';
import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

let getBlogGenerationArgs;

beforeAll(async () => {
  ({ getBlogGenerationArgs } = await import(
    '../../src/generator/generator.js'
  ));
});

describe('createSection integration', () => {
  test('header and footer sections include entry div', () => {
    const { header, footer } = getBlogGenerationArgs();
    expect(header).toContain('<div class="entry">');
    expect(footer).toContain('<div class="entry">');
  });
});

async function loadCreateSection() {
  const filePath = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../src/generator/generator.js'
  );
  const code = readFileSync(filePath, 'utf8');
  const tempPath = path.join(path.dirname(filePath), `__cs_${process.pid}.js`);
  writeFileSync(
    tempPath,
    `${code}\nexport { createSection as __createSection };`
  );
  const url = pathToFileURL(tempPath).toString();
  const module = await import(url + `?cacheBust=${Date.now()}`);
  unlinkSync(tempPath);
  return module.__createSection;
}

describe('createSection unit', () => {
  test('wraps content in entry div', async () => {
    const createSection = await loadCreateSection();
    const result = createSection('foo');
    expect(result).toBe('<div class="entry">foo</div>');
  });
});
