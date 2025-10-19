import { jest } from '@jest/globals';
import { createHandleClick } from '../../src/core/browser/tags.js';

describe('createHandleClick', () => {
  it('calls stopDefault and toggleHideLink with correct arguments', () => {
    const stopDefault = jest.fn();
    // Provide all DOM methods needed by toggleHideLink
    const hasNextSiblingClass = jest.fn(() => true);
    const removeNextSibling = jest.fn();
    const dom = {
      stopDefault,
      hasNextSiblingClass,
      removeNextSibling,
      createHideSpan: jest.fn(),
    };
    const link = { id: 'link1' };
    const className = 'tag-foo';
    const fakeEvent = {};

    const handler = createHandleClick(dom, link, className);
    handler(fakeEvent);

    expect(stopDefault).toHaveBeenCalledWith(fakeEvent);
    expect(hasNextSiblingClass).toHaveBeenCalledWith(link, 'hide-span');
    expect(removeNextSibling).toHaveBeenCalledWith(link);
  });
});
