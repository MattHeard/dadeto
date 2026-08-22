import { jest } from '@jest/globals';
import { revealBetaArticles } from '../../../src/core/browser/beta.js';

describe('revealBetaArticles', () => {
  test('reveals every beta article when the URL has the beta flag', () => {
    const articles = [{ id: 1 }, { id: 2 }];
    const dom = {
      hasBetaParam: jest.fn(() => true),
      querySelectorAll: jest.fn(() => articles),
      removeClass: jest.fn(),
      reveal: jest.fn(),
    };

    revealBetaArticles(dom);

    expect(dom.querySelectorAll).toHaveBeenCalledWith('article.release-beta');
    expect(dom.removeClass).toHaveBeenNthCalledWith(
      1,
      articles[0],
      'release-beta'
    );
    expect(dom.removeClass).toHaveBeenNthCalledWith(
      2,
      articles[1],
      'release-beta'
    );
    expect(dom.reveal).toHaveBeenNthCalledWith(1, articles[0]);
    expect(dom.reveal).toHaveBeenNthCalledWith(2, articles[1]);
  });

  test('does nothing when the URL has no beta flag', () => {
    const dom = {
      hasBetaParam: jest.fn(() => false),
      querySelectorAll: jest.fn(),
      removeClass: jest.fn(),
      reveal: jest.fn(),
    };

    revealBetaArticles(dom);

    expect(dom.querySelectorAll).not.toHaveBeenCalled();
    expect(dom.removeClass).not.toHaveBeenCalled();
    expect(dom.reveal).not.toHaveBeenCalled();
  });
});
