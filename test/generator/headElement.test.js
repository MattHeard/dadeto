import { describe, test, expect } from '@jest/globals';
import { headElement } from '../../src/generator/head.js';

describe('headElement', () => {
  test('contains required meta tags', () => {
    expect(headElement).toContain('<meta charset="UTF-8">');
    expect(headElement).toContain(
      '<link rel="manifest" href="/site.webmanifest">'
    );
    expect(headElement).toContain(
      '<meta name="viewport" content="width=device-width">'
    );
  });

  test('includes style and script sections', () => {
    expect(headElement.startsWith('<head>')).toBe(true);
    expect(headElement).toContain('<style>');
    expect(headElement).toContain('</style>');
    expect(headElement).toContain('<script type="module">');
    expect(headElement).toContain('window.addComponent');
    expect(headElement.trim().endsWith('</head>')).toBe(true);
  });

  test('includes basic title tag', () => {
    expect(headElement).toContain('<title>Matt Heard</title>');
  });
});
