export function startsWith(str, prefix) {
  return str.indexOf(prefix) === 0;
}

function hideIfHasClass(article, className, hasClassFn, hideElementFn) {
  if (hasClassFn(article, className)) {
    hideElementFn(article);
  }
}

/**
 * Functions for handling tags and filtering articles
 */

/**
 * Returns a className handler for tag links (used in handleTagLinks)
 * @param {object} dom - DOM helpers
 * @param {HTMLElement} link - The tag link element
 * @returns {Function} Handler for className
 */
export const makeHandleClassName = (dom, link) => className => {
  if (startsWith(className, 'tag-')) {
    const createHideSpan = makeHandleHideSpan(dom);
    const clickDeps = { ...dom, createHideSpan };
    const handleClick = createHandleClick(clickDeps, link, className);
    dom.addEventListener(link, 'click', handleClick);
    return; // exit after first tag- match
  }
};

/**
 * Returns a handler for a tag link (used in handleTagLinks)
 * @param {object} dom - DOM helpers
 * @returns {Function} Handler for a link
 */
export const makeHandleLink = dom => link => {
  const handleClassName = makeHandleClassName(dom, link);
  dom.getClasses(link).forEach(handleClassName);
};

/**
 * Hides articles that contain a specific CSS class
 * @param {string} className - The CSS class to filter by
 * @param {object} dom - Object containing DOM helper functions: getElementsByTagName, hasClass, hide
 */
export function makeHandleHideClick(dom, className) {
  return function(event) {
    dom.stopDefault(event);
    hideArticlesByClass(className, dom);
  };
}

/**
 * Factory to create a function that adds a hide-span to a tag link
 * @param {object} dom - DOM helpers
 * @returns {Function}
 */
export function makeHandleHideSpan(dom) {
  return function createHideSpan(link, className) {
    var span = dom.createElement('span');
    dom.addClass(span, 'hide-span');
    dom.appendChild(span, dom.createTextNode(" ("));

    var hideLink = dom.createElement('a');
    dom.setTextContent(hideLink, "hide");

    const handleHideClick = makeHandleHideClick(dom, className);
    dom.addEventListener(hideLink, 'click', handleHideClick);

    dom.appendChild(span, hideLink);
    dom.appendChild(span, dom.createTextNode(")"));
    dom.insertBefore(link.parentNode, span, link.nextSibling);
  };
}

export function hideArticlesByClass(className, dom) {
  const articles = dom.getElementsByTagName('article');
  for (const article of articles) {
    hideIfHasClass(article, className, dom.hasClass, dom.hide);
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
