/* @jest-environment jsdom */
import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';

test('constrains the canvas wrapper before its minimum height and aspect ratio can widen it', () => {
  const style = document.createElement('style');
  style.textContent = readFileSync(
    'src/content/pages/tetracube/styles.css',
    'utf8'
  );
  document.head.append(style);
  const wrapper = [...style.sheet.cssRules].find(
    rule => rule.selectorText === '.canvas-wrap'
  );
  expect(wrapper.style.width).toBe('100%');
  expect(wrapper.style.getPropertyValue('min-width')).toBe('0');
  style.remove();
});
