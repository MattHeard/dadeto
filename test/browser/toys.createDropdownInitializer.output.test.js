import { describe, it, expect, jest } from '@jest/globals';
import { createDropdownInitializer } from '../../src/browser/toys.js';

describe('createDropdownInitializer output init', () => {
  it('handles existing output dropdowns', () => {
    const dropdown = { value: 'text' };
    const dom = {
      querySelectorAll: jest.fn(selector => {
        if (selector === 'article.entry .value > select.output') {
          return [dropdown];
        }
        if (selector === 'article.entry .value > select.input') {
          return [];
        }
        return [];
      }),
      addEventListener: jest.fn(),
    };
    const onOutputChange = jest.fn();
    const onInputChange = jest.fn();

    const init = createDropdownInitializer(onOutputChange, onInputChange, dom);
    init();

    expect(onOutputChange).toHaveBeenCalledWith({ currentTarget: dropdown });
    expect(dom.addEventListener).toHaveBeenCalledWith(
      dropdown,
      'change',
      onOutputChange
    );
  });
});
