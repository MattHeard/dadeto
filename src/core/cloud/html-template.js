import { readFileSync } from 'node:fs';

/**
 * Load and interpolate a checked-in HTML template.
 * @param {URL} templateUrl URL of the template file.
 * @param {Record<string, string>} values Template values.
 * @returns {string} Interpolated HTML.
 */
export function renderHtmlTemplate(templateUrl, values) {
  const template = readFileSync(templateUrl, 'utf8');
  return template.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_, key) => values[key]);
}
