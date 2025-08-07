import { describe, test, expect } from '@jest/globals';
import { PAGE_HTML } from '../../infra/cloud-functions/render-contents/htmlSnippets.js';

describe('PAGE_HTML', () => {
  test('places moderation and new story links above the list', () => {
    const html = PAGE_HTML('<li>Example</li>');
    const modIndex = html.indexOf('<a href="mod.html">');
    const newIndex = html.indexOf('<a href="new-story.html">');
    const listIndex = html.indexOf('<ol>');
    expect(modIndex).toBeGreaterThan(-1);
    expect(newIndex).toBeGreaterThan(-1);
    expect(modIndex).toBeLessThan(listIndex);
    expect(newIndex).toBeLessThan(listIndex);
  });
});
