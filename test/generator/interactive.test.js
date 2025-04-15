import { describe, it, expect } from '@jest/globals';
import { generateInteractiveComponentScript } from '../../src/generator/interactive.js';

describe('interactive', () => {
  it('generateInteractiveComponentScript returns correct script tag', () => {
    const id = 'test-id';
    const modulePath = './module.js';
    const functionName = 'myFunc';
    const expected = `<script type="module">window.addComponent('test-id', './module.js', 'myFunc');</script>`;
    const result = generateInteractiveComponentScript(id, modulePath, functionName);
    expect(result).toBe(expected);
  });
});
