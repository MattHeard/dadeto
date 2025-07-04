import { jest } from '@jest/globals';
import { makeHandleHideClick } from '../../src/browser/tags.js';

describe('makeHandleHideClick', () => {
  it('calls stopDefault and hides only articles with the given class', () => {
    const article1 = { classList: { contains: cls => cls === 'foo' } };
    const article2 = { classList: { contains: () => false } };
    const articles = [article1, article2];
    const stopDefault = jest.fn();
    const hide = jest.fn();
    const dom = {
      stopDefault,
      getElementsByTagName: jest.fn(() => articles),
      hasClass: (el, className) => el.classList.contains(className),
      hide,
    };
    const handler = makeHandleHideClick(dom, 'foo');
    const fakeEvent = {};
    handler(fakeEvent);
    expect(stopDefault).toHaveBeenCalledWith(fakeEvent);
    expect(hide).toHaveBeenCalledTimes(1);
    expect(hide).toHaveBeenCalledWith(article1);
    expect(hide).not.toHaveBeenCalledWith(article2);
  });
});
