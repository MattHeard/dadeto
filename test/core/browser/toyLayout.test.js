import { expect, test } from '@jest/globals';
import { JSDOM } from 'jsdom';
import { dom } from '../../../src/core/browser/document.js';
import { toggleToyLayout } from '../../../src/core/browser/toys.js';

test('swaps existing input/output pairs and keeps controls, metadata and state intact', () => {
  const document = new JSDOM(`<article class="entry">
    <div class="key">text</div><div class="value">Description</div>
    <div class="key">in</div><div class="value"><select class="input"></select><input value="kept"></div>
    <div class="key"></div><div class="value"><button class="toy-swap-toggle"></button><button class="toy-focus-toggle">Focus mode</button></div>
    <div class="key">out</div><div class="value"><select class="output"></select><canvas></canvas></div>
    <div class="key">tags</div><div class="value">Footer</div>
  </article>`).window.document;
  const article = document.querySelector('article');
  const swap = article.querySelector('.toy-swap-toggle');
  const input = article.querySelector('input');
  const canvas = article.querySelector('canvas');
  const original = Array.from(article.children);

  toggleToyLayout(swap, dom);

  expect(Array.from(article.children)).toEqual([
    ...original.slice(0, 2),
    ...original.slice(6, 8),
    ...original.slice(2, 6),
    ...original.slice(8),
  ]);
  expect(swap.getAttribute('aria-pressed')).toBe('true');
  expect(article.querySelector('input')).toBe(input);
  expect(input.value).toBe('kept');
  expect(article.querySelector('canvas')).toBe(canvas);

  const focus = article.querySelector('.toy-focus-toggle');
  toggleToyLayout(focus, dom);
  expect(article.classList.contains('toy-focus-mode')).toBe(true);
  toggleToyLayout(swap, dom);
  expect(Array.from(article.children)).toEqual(original);
  expect(swap.getAttribute('aria-pressed')).toBe('false');
  toggleToyLayout(focus, dom);
  expect(article.classList.contains('toy-focus-mode')).toBe(false);
  article.removeChild(swap.parentElement);
  toggleToyLayout(swap, dom);
});
