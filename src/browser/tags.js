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
 * @param {Function} hasNextSiblingClass - Function to check if the next sibling has a class
 * @param {Function} removeNextSibling - Function to remove the next sibling
 * @param {Function} createHideSpan - Function to create the hide span element
 */
export function toggleHideLink(link, className, hasNextSiblingClass, removeNextSibling, createHideSpan) {
  // Check if a span with the hide link already exists immediately after the link.
  if (hasNextSiblingClass(link, 'hide-span')) {
    // Remove the span if it exists.
    removeNextSibling(link);
  } else {
    createHideSpan(link, className);
  }
}
