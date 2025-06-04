import { jest } from '@jest/globals';
import { makeHandleHideSpan } from '../../src/browser/tags.js';

describe('makeHandleHideSpan', () => {
  it('creates a hide link span and inserts it after the link', () => {
    const spanEl = {};
    const hideLinkEl = {};
    const textNode1 = {};
    const textNode2 = {};
    const dom = {
      createElement: jest.fn(tag => {
        if (tag === 'span') {return spanEl;}
        if (tag === 'a') {return hideLinkEl;}
        return {};
      }),
      addClass: jest.fn(),
      appendChild: jest.fn(),
      createTextNode: jest.fn(txt => (txt === ' (' ? textNode1 : textNode2)),
      setTextContent: jest.fn(),
      addEventListener: jest.fn(),
      insertBefore: jest.fn(),
    };
    const link = { parentNode: {}, nextSibling: {} };
    const createHideSpan = makeHandleHideSpan(dom);
    createHideSpan(link, 'foo');
    expect(dom.createElement).toHaveBeenCalledWith('span');
    expect(dom.addClass).toHaveBeenCalledWith(spanEl, 'hide-span');
    expect(dom.createElement).toHaveBeenCalledWith('a');
    expect(dom.setTextContent).toHaveBeenCalledWith(hideLinkEl, 'hide');
    expect(dom.addEventListener).toHaveBeenCalledWith(
      hideLinkEl,
      'click',
      expect.any(Function)
    );
    expect(dom.insertBefore).toHaveBeenCalledWith(
      link.parentNode,
      spanEl,
      link.nextSibling
    );
  });
});
