import { describe, it, expect } from '@jest/globals';

describe('headElement dynamic import', () => {
  it('includes essential meta tags', async () => {
    const { headElement } = await import(
      '../../src/generator/head.js?' + Math.random()
    );
    expect(headElement).toContain('<meta charset="UTF-8">');
    expect(headElement.trim().endsWith('</head>')).toBe(true);
  });
});
