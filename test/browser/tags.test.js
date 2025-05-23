import { jest } from '@jest/globals';
import { hideArticlesByClass, toggleHideLink, makeHandleClassName, makeHandleLink, makeHandleHideSpan } from '../../src/browser/tags.js';


describe('hideArticlesByClass', () => {
  it('does not throw when given a class and no matching elements', () => {
    const dom = {
      getElementsByTagName: () => [],
      hasClass: () => false,
      hide: () => {}
    };

    expect(() => {
      hideArticlesByClass('some-class', dom);
    }).not.toThrow();
  });

  it('hides articles with the given class', () => {
    const article1 = {};
    const article2 = {};
    const articles = [article1, article2];

    const dom = {
      getElementsByTagName: () => articles,
      hasClass: (el, className) => el === article1 && className === 'target-class',
      hide: jest.fn()
    };

    hideArticlesByClass('target-class', dom);

    expect(dom.hide).toHaveBeenCalledTimes(1);
    expect(dom.hide).toHaveBeenCalledWith(article1);
  });
});

describe('toggleHideLink', () => {
  it('removes the next sibling when it has the hide-span class', () => {
    const link = {};
    const dom = {
      hasNextSiblingClass: () => true,
      removeNextSibling: jest.fn(),
      createHideSpan: jest.fn()
    };

    toggleHideLink(link, 'some-class', dom);

    expect(dom.removeNextSibling).toHaveBeenCalledWith(link);
    expect(dom.createHideSpan).not.toHaveBeenCalled();
  });

  it('creates a hide span when there is no next sibling with the hide-span class', () => {
    const link = {};
    const dom = {
      hasNextSiblingClass: () => false,
      removeNextSibling: jest.fn(),
      createHideSpan: jest.fn()
    };

    toggleHideLink(link, 'some-class', dom);

    expect(dom.createHideSpan).toHaveBeenCalledWith(link, 'some-class');
    expect(dom.removeNextSibling).not.toHaveBeenCalled();
  });
});

describe('makeHandleClassName', () => {
  it('returns a function when called with no arguments', () => {
    const handler = makeHandleClassName();
    const result = handler('foo');
    expect(result).toBeUndefined();
  });

  it('calls addEventListener when className starts with tag-', () => {
    const addEventListener = jest.fn();
    const dom = { addEventListener };
    const link = {};
    const handler = makeHandleClassName(dom, link);
    handler('tag-sample');
    expect(addEventListener).toHaveBeenCalledWith(link, 'click', expect.any(Function));
  });
});

describe('makeHandleLink', () => {
  it('invokes the returned function with a mock dom and asserts its value is undefined', () => {
    const dom = { getClasses: () => [] };
    const result = makeHandleLink(dom);
    const value = result();
    expect(value).toBeUndefined();
  });
});

describe('makeHandleHideSpan', () => {
  it('invokes makeHandleHideSpan and its returned function with minimal mock dom', () => {
    const dom = {
      createElement: () => ({}),
      addClass: () => {},
      appendChild: () => {},
      createTextNode: () => ({}),
      setTextContent: () => {},
      addEventListener: () => {},
      insertBefore: () => {},
    };
    const createHideSpan = makeHandleHideSpan(dom);
    const result = createHideSpan({}, 'some-class');
    expect(result).toBeUndefined();
  });
});
