import { describe, test, expect } from '@jest/globals';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

function loadFreshGenerator() {
  const filePath = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../src/generator/generator.js'
  );
  const url = pathToFileURL(filePath).toString();
  return import(url + `?fresh=${Date.now()}`);
}

describe('header generation fresh import', () => {
  test('fresh import includes banner and metadata', async () => {
    const { generateBlogOuter } = await loadFreshGenerator();
    const html = generateBlogOuter({ posts: [] });
    expect(html).toContain('aria-label="Matt Heard"');
    expect(html).toContain('Software developer and philosopher in Berlin');
  });
});
