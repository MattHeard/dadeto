/**
 * Wraps content with specified markers or HTML tags
 * @param {string} content - The content to wrap
 * @param {string|Object} wrapper - The wrapper configuration
 * @returns {string} The wrapped content
 */
export function wrapWith(content, wrapper) {
  if (!content && content !== '') {return '';}

  if (typeof wrapper === 'string') {
    return `${wrapper}${content}${wrapper}`;
  }

  if (wrapper && typeof wrapper === 'object') {
    const { open = '', close = '' } = wrapper;
    return `${open}${content}${close}`;
  }

  return String(content);
}

/**
 * Wraps content with HTML tags
 * @param {string} tagName - The HTML tag name
 * @param {string} content - The content to wrap
 * @param {Object} [attributes] - HTML attributes to add to the opening tag
 * @returns {string} The HTML-wrapped content
 */
export function wrapWithHtml(tagName, content, attributes = {}) {
  if (!tagName) {return content || '';}

  const attrs = Object.entries(attributes)
    .filter(([_, value]) => value !== false && value != null)
    .map(([key, value]) => {
      if (value === true) {return key;}
      const escapedValue = String(value)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;');
      return `${key}="${escapedValue}"`;
    })
    .join(' ');

  const openTag = `<${tagName}${attrs ? ' ' + attrs : ''}>`;
  const closeTag = content === undefined ? '' : `</${tagName}>`;

  return wrapWith(content, { open: openTag, close: closeTag });
}
