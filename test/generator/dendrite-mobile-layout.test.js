import { describe, expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';

const css = readFileSync(
  new URL('../../infra/dendrite.css', import.meta.url),
  'utf8'
);

describe('Dendrite mobile layout', () => {
  test('contains the stats chart so its fixed SVG cannot widen the page', () => {
    expect(css).toMatch(
      /#topStories\s*{[^}]*max-width:\s*100%;[^}]*overflow-x:\s*auto;/s
    );
    expect(css).toMatch(
      /#topStories svg\s*{[^}]*max-width:\s*100%;[^}]*height:\s*auto;/s
    );
  });
});
