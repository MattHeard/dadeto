import { describe, test, expect } from '@jest/globals';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

function loadGenerator() {
  const filePath = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../src/generator/generator.js'
  );
  const url = pathToFileURL(filePath).toString();
  return import(url + `?cacheBust=${Date.now()}`);
}

describe('header generation via getBlogGenerationArgs', () => {
  test('header contains banner and metadata', async () => {
    const { getBlogGenerationArgs } = await loadGenerator();
    const { header } = getBlogGenerationArgs();
    expect(header).toContain('aria-label="Matt Heard"');
    expect(header).toContain('Software developer and philosopher in Berlin');
  });

  test('header section is wrapped in entry div', async () => {
    const { getBlogGenerationArgs } = await loadGenerator();
    const { header } = getBlogGenerationArgs();
    expect(header).toContain('<div class="entry">');
  });
});
