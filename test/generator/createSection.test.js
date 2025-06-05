import { describe, test, expect, beforeAll } from '@jest/globals';

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
