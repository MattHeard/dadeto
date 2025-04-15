import { describe, it, expect } from '@jest/globals';
import { generateInteractiveComponentScript, generateInteractiveComponentHTML } from '../../src/generator/interactive.js';

describe('interactive', () => {
  it('generateInteractiveComponentScript returns correct script tag', () => {
    const id = 'test-id';
    const modulePath = './module.js';
    const functionName = 'myFunc';
    const expected = `<script type="module">window.addComponent('test-id', './module.js', 'myFunc');</script>`;
    const result = generateInteractiveComponentScript(id, modulePath, functionName);
    expect(result).toBe(expected);
  });

  it('generateInteractiveComponentHTML returns correct HTML structure', () => {
    const id = 'foo';
    const title = 'Bar Title';
    const html = generateInteractiveComponentHTML(id, title);
    expect(html).toContain('class="key article-title"');
    expect(html).toContain('foo');
    expect(html).toContain('Bar Title');
    expect(html).toContain('<form><input type="text" disabled></form>');
    expect(html).toContain('This toy requires Javascript to run.');
  });
});
