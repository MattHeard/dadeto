import { describe, test, expect } from '@jest/globals';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

function loadGenerator() {
  const filePath = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../src/generator/generator.js'
  );
  const url = pathToFileURL(filePath).toString();
  const cacheBust = `?cacheBust=${Date.now()}`;
  return import(url + cacheBust);
}

describe('header generation', () => {
  test('generateBlogOuter includes banner and metadata', async () => {
    const { generateBlogOuter } = await loadGenerator();
    const html = generateBlogOuter({ posts: [] });
    expect(html).toContain('aria-label="Matt Heard"');
    expect(html).toContain('Software developer and philosopher in Berlin');
  });

  test('metadata div has the metadata class', async () => {
    const { getBlogGenerationArgs } = await loadGenerator();
    const { header } = getBlogGenerationArgs();
    expect(header).toContain('class="value metadata"');
  });
});
