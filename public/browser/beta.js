export function revealBetaArticles(dom) {
  if (dom.hasBetaParam()) {
    const articles = dom.querySelectorAll('article.release-beta');
    Array.from(articles).forEach(article => {
      dom.removeClass(article, 'release-beta');
      dom.reveal(article);
    });
  }
}
