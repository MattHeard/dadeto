import { describe, it, expect } from '@jest/globals';
import { generateInteractiveComponentScript, generateInteractiveComponentHTML, generateCompleteInteractiveComponent } from '../../src/generator/interactive.js';

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

  it('generateCompleteInteractiveComponent returns full HTML with structure and script', () => {
    const id = 'comp42';
    const title = 'The Answer';
    const modulePath = './answer.js';
    const functionName = 'getAnswer';
    const html = generateCompleteInteractiveComponent(id, title, modulePath, functionName);
    expect(html).toContain('class="key article-title"');
    expect(html).toContain('comp42');
    expect(html).toContain('The Answer');
    expect(html).toContain('<form><input type="text" disabled></form>');
    expect(html).toContain('This toy requires Javascript to run.');
    expect(html).toContain(`<script type="module">window.addComponent('comp42', './answer.js', 'getAnswer');</script>`);
  });
});
