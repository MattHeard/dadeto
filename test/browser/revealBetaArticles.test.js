import { describe, test, expect, jest } from '@jest/globals';
import { revealBetaArticles } from '../../src/browser/beta.js';

describe('revealBetaArticles', () => {
  test('reveals beta articles when query parameter is present', () => {
    const articles = [{}, {}];
    const dom = {
      querySelectorAll: jest.fn(() => articles),
      reveal: jest.fn(),
      hasBetaParam: () => true,
    };
    revealBetaArticles(dom);
    expect(dom.querySelectorAll).toHaveBeenCalledWith('article.release-beta');
    expect(dom.reveal).toHaveBeenCalledTimes(2);
    expect(dom.reveal).toHaveBeenCalledWith(articles[0]);
    expect(dom.reveal).toHaveBeenCalledWith(articles[1]);
  });

  test('does nothing when query parameter is absent', () => {
    const dom = {
      querySelectorAll: jest.fn(),
      reveal: jest.fn(),
      hasBetaParam: () => false,
    };
    revealBetaArticles(dom);
    expect(dom.querySelectorAll).not.toHaveBeenCalled();
    expect(dom.reveal).not.toHaveBeenCalled();
  });
});
