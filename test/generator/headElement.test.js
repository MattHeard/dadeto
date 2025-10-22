import { describe, test, expect } from '@jest/globals';
import { headElement } from '../../src/build/head.js';

describe('headElement', () => {
  test('contains required meta tags', () => {
    const head = headElement();
    expect(head).toContain('<meta charset="UTF-8">');
    expect(head).toContain('<link rel="manifest" href="/site.webmanifest">');
  });

  test('includes style and script sections', () => {
    const head = headElement();
    expect(head.startsWith('<head>')).toBe(true);
    expect(head).toContain('<style>');
    expect(head).toContain('</style>');
    expect(head).toContain('<script type="module">');
    expect(head).toContain('window.addComponent');
    expect(head.trim().endsWith('</head>')).toBe(true);
  });

  test('contains page title', () => {
    const head = headElement();
    expect(head).toContain('<title>Matt Heard</title>');
    expect(head.length).toBeGreaterThan(0);
  });
});
