/**
 * Sanitize a URL for error reporting.
 * @param {string} rawUrl Raw URL.
 * @returns {string} URL without query string or fragment.
 */
export function sanitizeUrl(rawUrl) {
  if (typeof URL.canParse === 'function' && !URL.canParse(rawUrl)) {
    return '';
  }

  const url = new URL(rawUrl);
  return `${url.origin}${url.pathname}`;
}
