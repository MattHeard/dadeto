/**
 * Functions for handling tags and filtering articles
 */

/**
 * Hides articles that contain a specific CSS class
 * @param {string} className - The CSS class to filter by
 * @param {Function} getElementsByTagName - Function to get elements by tag name
 * @param {Function} hasClassFn - Function to check if an element has a class
 * @param {Function} hideElementFn - Function to hide an element
 */
export function hideArticlesByClass(className, getElementsByTagName, hasClassFn, hideElementFn) {
  var articles = getElementsByTagName('article');
  for (var i = 0; i < articles.length; i++) {
    if (hasClassFn(articles[i], className)) {
      hideElementFn(articles[i]);
    }
  }
}
