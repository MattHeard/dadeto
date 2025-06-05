import { describe, test, expect } from '@jest/globals';
import { headElement } from '../../src/generator/head.js';

describe('headElement', () => {
  test('contains required meta tags', () => {
    expect(headElement).toContain('<meta charset="UTF-8">');
    expect(headElement).toContain(
      '<link rel="manifest" href="/site.webmanifest">'
    );
  });
});
