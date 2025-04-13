import { jest } from '@jest/globals';
import { hideArticlesByClass } from '../../src/browser/tags.js';

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
