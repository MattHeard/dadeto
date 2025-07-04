import { jest } from '@jest/globals';
import { handleTagLinks } from '../../src/browser/tags.js';

describe('handleTagLinks', () => {
  it('applies makeHandleLink(dom) to each <a> element', () => {
    // Create mock <a> elements
    const link1 = { classList: { forEach: jest.fn() } };
    const link2 = { classList: { forEach: jest.fn() } };
    // Mock dom helpers
    const dom = {
      getElementsByTagName: jest.fn(() => [link1, link2]),
      getClasses: jest.fn(el => {
        if (el === link1) {
          return ['tag-foo'];
        } else {
          return ['tag-bar'];
        }
      }),
      addEventListener: jest.fn(),
    };
    // Run
    handleTagLinks(dom);
    // Should call getElementsByTagName('a')
    expect(dom.getElementsByTagName).toHaveBeenCalledWith('a');
    // Should call getClasses on each link
    expect(dom.getClasses).toHaveBeenCalledWith(link1);
    expect(dom.getClasses).toHaveBeenCalledWith(link2);
  });
});
