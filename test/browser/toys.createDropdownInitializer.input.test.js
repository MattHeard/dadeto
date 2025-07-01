import { describe, it, expect, jest } from '@jest/globals';
import { createDropdownInitializer } from '../../src/browser/toys.js';

// Verify that initializeDropdowns triggers handlers for preselected dropdowns

describe('createDropdownInitializer input init', () => {
  it('calls onInputChange for existing dropdown selection', () => {
    const dropdown = { value: 'dendrite-story' };

    const SELECT_INPUT = 'article.entry .value > select.input';
    const dom = {
      querySelectorAll: jest.fn(selector => {
        const mapping = {
          [SELECT_INPUT]: [dropdown],
        };
        return mapping[selector] || [];
      }),
      addEventListener: jest.fn(),
    };

    const onOutputChange = jest.fn();
    const onInputChange = jest.fn();

    const init = createDropdownInitializer(onOutputChange, onInputChange, dom);
    init();

    expect(onInputChange).toHaveBeenCalledWith({ currentTarget: dropdown });
    expect(dom.addEventListener).toHaveBeenCalledWith(
      dropdown,
      'change',
      onInputChange
    );
  });
});
