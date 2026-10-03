import { expect, test } from '@jest/globals';
import { JSDOM } from 'jsdom';
import { dom } from '../../../src/core/browser/document.js';
import { toggleToyLayout } from '../../../src/core/browser/toys.js';
import {
  createToyLayout,
  swapToySections,
} from '../../../src/core/browser/toyLayout.js';
import {
  createToyLayoutView,
  renderToyLayout,
} from '../../../src/core/browser/presenters/toyLayout.js';

/**
 * Create real section nodes for testing retained DOM projection.
 * @returns {HTMLElement} Toy article fixture.
 */
function createFixture() {
  const document = new JSDOM(`<article class="entry">
    <div class="key">text</div><div class="value">Description</div>
    <div class="key">in</div><div class="value"><select class="input"></select><input value="kept"></div>
    <div class="key"></div><div class="value"><button class="toy-swap-toggle"></button><button class="toy-focus-toggle">Focus mode</button></div>
    <div class="key">out</div><div class="value"><select class="output"></select><canvas></canvas></div>
    <div class="key">tags</div><div class="value">Footer</div>
  </article>`).window.document;
  return document.querySelector('article');
}

test('logical section swaps return new state and leave previous order unchanged', () => {
  const initial = createToyLayout();
  const swapped = swapToySections(initial);
  expect(initial.order).toEqual(['input', 'output']);
  expect(swapped.order).toEqual(['output', 'input']);
  expect(swapped).not.toBe(initial);
  expect(swapped.order).not.toBe(initial.order);
  expect(swapToySections(swapped)).toEqual(initial);
});

test('binds the stable boundary before grouping retained section nodes', () => {
  const article = createFixture();
  const button = article.querySelector('.toy-swap-toggle');
  const output = article.querySelector('select.output').closest('.value');
  const boundary = output.nextSibling;
  const input = article.querySelector('select.input').closest('.value');
  const inputKey = input.previousElementSibling;
  const reads = [];
  Object.defineProperty(output, 'nextSibling', {
    get() {
      reads.push('boundary');
      return boundary;
    },
  });
  Object.defineProperty(input, 'previousElementSibling', {
    get() {
      reads.push('input');
      return inputKey;
    },
  });
  const view = createToyLayoutView(article, button, dom);
  expect(reads).toEqual(['boundary', 'input']);
  expect(view.boundary).toBe(boundary);
  expect(view.sections.input.slice(0, 2)).toEqual([inputKey, input]);
  expect(view.sections.input).toHaveLength(4);
  expect(view.sections.input[3]).toBe(button.parentElement);
  expect(view.sections.output[1]).toBe(output);
});

test('DOM projection follows logical order regardless of stale view state', () => {
  const article = createFixture();
  const button = article.querySelector('.toy-swap-toggle');
  const view = createToyLayoutView(article, button, dom);
  const initial = createToyLayout();
  const original = Array.from(article.children);
  article.classList.add('toy-output-first');
  button.setAttribute('aria-pressed', 'true');
  article.insertBefore(view.sections.output[0], article.firstElementChild);
  renderToyLayout(initial, view, dom);
  expect(Array.from(article.children)).toEqual(original);
  expect(button.getAttribute('aria-pressed')).toBe('false');
  const swapped = swapToySections(initial);
  renderToyLayout(swapped, view, dom);
  const projected = Array.from(article.children);
  renderToyLayout(swapped, view, dom);
  expect(Array.from(article.children)).toEqual(projected);
  expect(projected.slice(2, 4)).toEqual(view.sections.output);
  expect(projected.slice(4, 8)).toEqual(view.sections.input);
  expect(button.getAttribute('aria-pressed')).toBe('true');
});

test('swaps existing input/output pairs and keeps controls, metadata and state intact', () => {
  const article = createFixture();
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
