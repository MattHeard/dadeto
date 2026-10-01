// @ts-nocheck -- JSONL rows are intentionally narrowed at runtime by validation.
import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_DATA_ROOT = path.resolve(process.cwd(), 'src/content/blog-data');
const SUPPORTED_TYPES = new Set(['number', 'string']);

/**
 * Throw a consistent table validation error.
 * @param {string} message Validation failure.
 * @returns {never} Always throws.
 */
function fail(message) {
  throw new TypeError(`Invalid static JSONL table: ${message}`);
}

/**
 * Validate the table content descriptor.
 * @param {{source: string, columns: string[], collapsed?: boolean}} entry Table descriptor.
 * @returns {void} Throws for an invalid definition.
 */
function validateDefinition(entry) {
  if (!entry || typeof entry !== 'object') fail('entry must be an object');
  if (typeof entry.source !== 'string' || !entry.source.trim())
    fail('source must be a non-empty string');
  if (!Array.isArray(entry.columns) || entry.columns.length === 0)
    fail('columns must be a non-empty array');
  if (entry.columns.some(column => typeof column !== 'string' || !column))
    fail('columns must contain non-empty strings');
  if (new Set(entry.columns).size !== entry.columns.length)
    fail('columns must be unique');
  if (
    path.isAbsolute(entry.source) ||
    entry.source.split(/[\\/]/).includes('..')
  )
    fail('source must stay inside the static data directory');
}

/**
 * Compare two values using their validated logical type.
 * @param {string|number} left First cell.
 * @param {string|number} right Second cell.
 * @param {string} type Validated logical type.
 * @returns {number} Sort comparison.
 */
function compareValues(left, right, type) {
  if (type === 'number') return left - right;
  return left < right ? -1 : left > right ? 1 : 0;
}

/**
 * Compare rows using all declared columns and stable source order.
 * @param {{index: number, values: Record<string, string|number>}} left First row.
 * @param {{index: number, values: Record<string, string|number>}} right Second row.
 * @param {string[]} columns Ordered columns.
 * @param {Record<string, string>} types Column types.
 * @returns {number} Stable sort comparison.
 */
function compareRows(left, right, columns, types) {
  for (const column of columns) {
    const comparison = compareValues(
      left.values[column],
      right.values[column],
      types[column]
    );
    if (comparison !== 0) return comparison;
  }
  return left.index - right.index;
}

/**
 * Read, validate, project, and initially sort a JSONL table.
 * @param {{source: string, columns: string[], collapsed?: boolean}} entry Table descriptor.
 * @param {{dataRoot?: string}} options Source directory override.
 * @returns {{columns: string[], collapsed: boolean, rows: Array<{index: number, values: Record<string, string|number>}>}} Parsed table.
 */
export function parseStaticJsonlTable(entry, options = {}) {
  validateDefinition(entry);
  const dataRoot = options.dataRoot ?? DEFAULT_DATA_ROOT;
  const sourcePath = path.resolve(dataRoot, entry.source);
  let source;
  try {
    source = fs.readFileSync(sourcePath, 'utf8');
  } catch (error) {
    throw new Error(
      `Invalid static JSONL table: unable to read ${entry.source}`,
      { cause: error }
    );
  }
  const rows = [];
  source.split(/\r?\n/).forEach((line, lineIndex) => {
    if (!line.trim()) return;
    let value;
    try {
      value = JSON.parse(line);
    } catch (error) {
      throw new Error(
        `Invalid static JSONL table: malformed JSON on line ${lineIndex + 1}`,
        { cause: error }
      );
    }
    if (!value || typeof value !== 'object' || Array.isArray(value))
      fail(`line ${lineIndex + 1} must contain a JSON object`);
    const projected = {};
    entry.columns.forEach(column => {
      if (!Object.prototype.hasOwnProperty.call(value, column))
        fail(`line ${lineIndex + 1} is missing column ${column}`);
      const cell = value[column];
      if (
        !SUPPORTED_TYPES.has(typeof cell) ||
        (typeof cell === 'number' && !Number.isFinite(cell))
      )
        fail(
          `column ${column} contains an unsupported value on line ${lineIndex + 1}`
        );
      projected[column] = cell;
    });
    rows.push({ index: rows.length, values: projected });
  });
  const types = Object.fromEntries(
    entry.columns.map(column => [column, undefined])
  );
  rows.forEach(row =>
    entry.columns.forEach(column => {
      const type = typeof row.values[column];
      if (types[column] === undefined) types[column] = type;
      else if (types[column] !== type)
        fail(`column ${column} contains inconsistent JSON types`);
    })
  );
  rows.sort((left, right) => compareRows(left, right, entry.columns, types));
  return { columns: entry.columns, collapsed: entry.collapsed === true, rows };
}

/**
 * Escape text for an HTML attribute.
 * @param {unknown} value Attribute value.
 * @returns {string} Escaped attribute.
 */
function escapeAttribute(value) {
  const entities = { '&': '&amp;', '"': '&quot;', '<': '&lt;', '>': '&gt;' };
  return String(value).replace(/[&"<>]/g, character => entities[character]);
}
/**
 * Escape text for an HTML text node.
 * @param {unknown} value Text value.
 * @returns {string} Escaped text.
 */
function escapeText(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Render a validated JSONL table as self-contained static HTML.
 * @param {{source: string, columns: string[], collapsed?: boolean}} entry Table descriptor.
 * @param {{dataRoot?: string}} options Source directory override.
 * @returns {string} Self-contained table HTML.
 */
export function renderStaticJsonlTable(entry, options = {}) {
  const table = parseStaticJsonlTable(entry, options);
  const payload = JSON.stringify(table).replace(/</g, '\\u003c');
  const open = table.collapsed ? '' : ' open';
  const headers = table.columns
    .map(
      column =>
        `<th scope="col"><button type="button" data-static-table-sort="${escapeAttribute(column)}" aria-label="Sort by ${escapeAttribute(column)}">${escapeText(column)} <span data-static-table-indicator="${escapeAttribute(column)}"></span></button></th>`
    )
    .join('');
  const body = table.rows
    .map(
      row =>
        `<tr>${table.columns.map(column => `<td>${escapeText(row.values[column])}</td>`).join('')}</tr>`
    )
    .join('');
  return `<details class="static-jsonl-table" data-static-jsonl-table${open}><summary>Table</summary><table><thead><tr>${headers}</tr></thead><tbody>${body}</tbody></table><script type="application/json" data-static-table-data>${payload}</script></details>`;
}

export { compareValues, compareRows, validateDefinition };
