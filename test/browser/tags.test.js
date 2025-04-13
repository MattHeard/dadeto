import { jest } from '@jest/globals';
import { hideArticlesByClass, toggleHideLink } from '../../src/browser/tags.js';

describe('hideArticlesByClass', () => {
  it('does not throw when given a class and no matching elements', () => {
    const getElementsByTagName = () => [];
    const hasClassFn = () => false;
    const hideElementFn = () => {};

    expect(() => {
      hideArticlesByClass('some-class', getElementsByTagName, hasClassFn, hideElementFn);
    }).not.toThrow();
  });

  it('hides articles with the given class', () => {
    const article1 = {};
    const article2 = {};
    const articles = [article1, article2];

    const getElementsByTagName = () => articles;
    const hasClassFn = (el, className) => el === article1 && className === 'target-class';
    const hideElementFn = jest.fn();

    hideArticlesByClass('target-class', getElementsByTagName, hasClassFn, hideElementFn);

    expect(hideElementFn).toHaveBeenCalledTimes(1);
    expect(hideElementFn).toHaveBeenCalledWith(article1);
  });
});

describe('toggleHideLink', () => {
  it('removes the next sibling when it has the hide-span class', () => {
    const link = {};
    const hasNextSiblingClass = () => true;
    const removeNextSibling = jest.fn();
    const createHideSpan = jest.fn();

    toggleHideLink(link, 'some-class', hasNextSiblingClass, removeNextSibling, createHideSpan);

    expect(removeNextSibling).toHaveBeenCalledWith(link);
    expect(createHideSpan).not.toHaveBeenCalled();
  });

  it('creates a hide span when there is no next sibling with the hide-span class', () => {
    const link = {};
    const hasNextSiblingClass = () => false;
    const removeNextSibling = jest.fn();
    const createHideSpan = jest.fn();

    toggleHideLink(link, 'some-class', hasNextSiblingClass, removeNextSibling, createHideSpan);

    expect(createHideSpan).toHaveBeenCalledWith(link, 'some-class');
    expect(removeNextSibling).not.toHaveBeenCalled();
  });
});
