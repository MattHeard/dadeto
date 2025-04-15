function hideIfHasClass(article, className, hasClassFn, hideElementFn) {
  if (hasClassFn(article, className)) {
    hideElementFn(article);
  }
}

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
  const articles = getElementsByTagName('article');
  for (const article of articles) {
    hideIfHasClass(article, className, hasClassFn, hideElementFn);
  }
}

/**
 * Toggles the hide link for a given tag link
 * @param {HTMLElement} link - The tag link element
 * @param {string} className - The CSS class to filter by
 * @param {object} dom - Object containing DOM helpers: hasNextSiblingClass, removeNextSibling, createHideSpan
 */
export function toggleHideLink(link, className, dom) {
  // Check if a span with the hide link already exists immediately after the link.
  if (dom.hasNextSiblingClass(link, 'hide-span')) {
    // Remove the span if it exists.
    dom.removeNextSibling(link);
  } else {
    dom.createHideSpan(link, className);
  }
}

/**
 * Returns a click handler for tag links that toggles the hide link using the provided dom helpers
 * @param {object} dom - Object containing DOM helpers: stopDefault, hasNextSiblingClass, removeNextSibling, createHideSpan
 * @param {HTMLElement} link - The tag link element
 * @param {string} className - The CSS class to filter by
 * @returns {Function} Event handler
 */
export const createHandleClick = (dom, link, className) => event => {
  dom.stopDefault(event);
  toggleHideLink(link, className, dom);
};
