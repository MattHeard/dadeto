/**
 * Interpolate checked-in HTML template text without reading the environment.
 * @param {string} template Template text.
 * @param {Record<string, string>} values Template values.
 * @returns {string} Interpolated HTML.
 */
export function renderHtmlTemplate(template, values) {
  return template.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_, key) => values[key]);
}
