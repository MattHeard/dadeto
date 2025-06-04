import { jest } from '@jest/globals';
import {
  hideArticlesByClass,
  toggleHideLink,
  makeHandleClassName,
  makeHandleLink,
  makeHandleHideSpan,
} from '../../src/browser/tags.js';

describe('hideArticlesByClass', () => {
  it('does not throw when given a class and no matching elements', () => {
    const dom = {
      getElementsByTagName: () => [],
      hasClass: () => false,
      hide: () => {},
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
      hasClass: (el, className) =>
        el === article1 && className === 'target-class',
      hide: jest.fn(),
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
      createHideSpan: jest.fn(),
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
      createHideSpan: jest.fn(),
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
    expect(addEventListener).toHaveBeenCalledWith(
      link,
      'click',
      expect.any(Function)
    );
  });
  it('triggers the stored handler without errors', () => {
    let storedHandler;
    const dom = {
      addEventListener: (_l, _e, h) => {
        storedHandler = h;
      },
      stopDefault: jest.fn(),
      hasNextSiblingClass: jest.fn(() => true),
      removeNextSibling: jest.fn(),
    };
    const link = { parentNode: {} };
    const handler = makeHandleClassName(dom, link);
    handler('tag-fire');
    expect(() => storedHandler('evt')).not.toThrow();
    expect(dom.stopDefault).toHaveBeenCalledWith('evt');
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

  it('creates a hide link span and inserts it after the link', () => {
    const span = {};
    const hideLink = {};
    const textNodeOpen = {};
    const textNodeClose = {};
    const createElement = jest.fn(tag => (tag === 'span' ? span : hideLink));
    const addClass = jest.fn();
    const appendChild = jest.fn();
    const createTextNode = jest.fn(text =>
      text === ' (' ? textNodeOpen : textNodeClose
    );
    const setTextContent = jest.fn();
    const addEventListener = jest.fn();
    const insertBefore = jest.fn();

    const dom = {
      createElement,
      addClass,
      appendChild,
      createTextNode,
      setTextContent,
      addEventListener,
      insertBefore,
    };

    const link = { parentNode: {}, nextSibling: {} };
    const createHideSpan = makeHandleHideSpan(dom);
    createHideSpan(link, 'tag-test');

    expect(createElement).toHaveBeenCalledWith('span');
    expect(addClass).toHaveBeenCalledWith(span, 'hide-span');
    expect(createTextNode).toHaveBeenCalledWith(' (');
    expect(appendChild).toHaveBeenCalledWith(span, textNodeOpen);
    expect(createElement).toHaveBeenCalledWith('a');
    expect(setTextContent).toHaveBeenCalledWith(hideLink, 'hide');
    expect(addEventListener).toHaveBeenCalledWith(
      hideLink,
      'click',
      expect.any(Function)
    );
    expect(appendChild).toHaveBeenCalledWith(span, hideLink);
    expect(createTextNode).toHaveBeenCalledWith(')');
    expect(appendChild).toHaveBeenCalledWith(span, textNodeClose);
    expect(insertBefore).toHaveBeenCalledWith(
      link.parentNode,
      span,
      link.nextSibling
    );
  });
});

describe('makeHandleClassName integration', () => {
  it('uses DOM helpers when the click handler is triggered', () => {
    let storedHandler;
    const dom = {
      addEventListener: (_link, _event, handler) => {
        storedHandler = handler;
      },
      stopDefault: jest.fn(),
      hasNextSiblingClass: jest.fn(() => true),
      removeNextSibling: jest.fn(),
      createHideSpan: jest.fn(),
    };
    const link = { parentNode: {} };
    const handler = makeHandleClassName(dom, link);
    handler('tag-test');
    storedHandler('evt');
    expect(dom.stopDefault).toHaveBeenCalledWith('evt');
    expect(dom.removeNextSibling).toHaveBeenCalledWith(link);
  });
});
