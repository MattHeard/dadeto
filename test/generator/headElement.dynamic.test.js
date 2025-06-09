import { describe, it, expect } from '@jest/globals';

describe('headElement dynamic import', () => {
  it('includes essential meta tags', async () => {
    const { headElement } = await import(
      '../../src/generator/head.js?' + Math.random()
    );
    const head = headElement();
    expect(head).toContain('<meta charset="UTF-8">');
    expect(head.trim().endsWith('</head>')).toBe(true);
  });
});
