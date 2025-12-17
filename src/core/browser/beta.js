/**
 * @typedef {object} BetaDomHelpers
 * @property {() => boolean} hasBetaParam Detects the beta query flag in the URL.
 * @property {(selector: string) => Element[]} querySelectorAll Finds elements matching the selector.
 * @property {(element: Element, className: string) => void} removeClass Removes a class from the provided element.
 * @property {(element: Element) => void} reveal Makes the element visible.
 */

/**
 * Reveal beta articles if the browser URL includes a beta parameter.
 * @param {BetaDomHelpers} dom - DOM helper with utility methods.
 */
export function revealBetaArticles(dom) {
  if (dom.hasBetaParam()) {
    const articles = dom.querySelectorAll('article.release-beta');
    Array.from(articles).forEach(article => {
      dom.removeClass(article, 'release-beta');
      dom.reveal(article);
    });
  }
}
