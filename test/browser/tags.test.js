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
});
