import {
  parseStaticJsonlDefinition,
  parseStaticJsonlConfinement,
} from '../../logic/boundary/static-jsonl-table/definition.js';
import { parseStaticJsonlCell } from '../../logic/boundary/static-jsonl-table/cell.js';
import { parseStaticJsonlText } from '../../logic/boundary/static-jsonl-table/text.js';
import {
  escapeStaticJsonlAttribute,
  escapeStaticJsonlText,
} from '../../logic/core/static-jsonl-table/escaping.js';
import { parseStaticJsonlLine } from '../../logic/boundary/static-jsonl-table/record.js';
import { compareTableValues as compareValues } from '../tableCore.js';

/** @typedef {{index: number, values: Record<string, string|number>}} StaticTableRow */

/**
 * Throw a consistent table validation error.
 * @param {string} message Validation failure.
 * @returns {never} Always throws.
 */
function fail(message) {
  throw new TypeError(`Invalid static JSONL table: ${message}`);
}

/**
 * Compare rows using all declared columns and stable source order.
 * @param {{index: number, values: Record<string, string|number>}} left First row.
 * @param {{index: number, values: Record<string, string|number>}} right Second row.
 * @param {string[]} columns Ordered columns.
 * @param {Record<string, string|undefined>} types Column types.
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
 * Escape text for an HTML attribute.
 * @param {unknown} value Attribute value.
 * @returns {string} Escaped attribute.
 */
function escapeAttribute(value) {
  const parsed = parseStaticJsonlText(value);
  if (!parsed.ok) throw parsed.error;
  return escapeStaticJsonlAttribute(parsed.evidence);
}
/**
 * Escape text for an HTML text node.
 * @param {unknown} value Text value.
 * @returns {string} Escaped text.
 */
function escapeText(value) {
  const parsed = parseStaticJsonlText(value);
  if (!parsed.ok) throw parsed.error;
  return escapeStaticJsonlText(parsed.evidence);
}

export { compareValues, compareRows };

/**
 * Compose static table parsing/rendering with explicit source capabilities.
 * @param {{fileSystem: {readFileSync: (path: string, encoding: 'utf8') => string}, paths: {resolve: (...parts: string[]) => string, isAbsolute: (path: string) => boolean}, defaultDataRoot: string}} dependencies Source reader, path operations and authored root.
 * @returns {{parseStaticJsonlTable: (entry: {source: string, columns: string[], collapsed?: boolean}, options?: {dataRoot?: string}) => {columns: string[], collapsed: boolean, rows: StaticTableRow[]}, renderStaticJsonlTable: (entry: {source: string, columns: string[], collapsed?: boolean}, options?: {dataRoot?: string}) => string, validateDefinition: (entry: {source: string, columns: string[], collapsed?: boolean}) => void}} Bound table helpers.
 */
export function createStaticJsonlTable(dependencies) {
  /**
   * Validate the table content descriptor.
   * @param {{source: string, columns: string[], collapsed?: boolean}} entry Table descriptor.
   * @returns {void} Throws for an invalid definition.
   */
  function validateDefinition(entry) {
    const parsed = parseStaticJsonlDefinition(entry);
    if (!parsed.ok) throw parsed.error;
    const confined = parseStaticJsonlConfinement(parsed.evidence, () =>
      dependencies.paths.isAbsolute(entry.source)
    );
    if (!confined.ok) throw confined.error;
  }

  /**
   * Read, validate, project, and initially sort a JSONL table.
   * @param {{source: string, columns: string[], collapsed?: boolean}} entry Table descriptor.
   * @param {{dataRoot?: string}} options Source directory override.
   * @returns {{columns: string[], collapsed: boolean, rows: Array<{index: number, values: Record<string, string|number>}>}} Parsed table.
   */
  function parseStaticJsonlTable(entry, options = {}) {
    validateDefinition(entry);
    const dataRoot = options.dataRoot ?? dependencies.defaultDataRoot;
    const sourcePath = dependencies.paths.resolve(dataRoot, entry.source);
    let source;
    try {
      source = dependencies.fileSystem.readFileSync(sourcePath, 'utf8');
    } catch (error) {
      throw new Error(
        `Invalid static JSONL table: unable to read ${entry.source}`,
        { cause: error }
      );
    }
    /** @type {StaticTableRow[]} */
    const rows = [];
    source.split(/\r?\n/).forEach((line, lineIndex) => {
      const parsed = parseStaticJsonlLine(line, lineIndex);
      if (!parsed.ok) throw parsed.error;
      if (parsed.evidence.kind === 'blank') return;
      const record = parsed.evidence.record;
      /** @type {Record<string, string|number>} */
      const projected = {};
      entry.columns.forEach(column => {
        const cell = parseStaticJsonlCell(record, column, lineIndex);
        if (!cell.ok) throw cell.error;
        projected[column] = cell.evidence;
      });
      rows.push({ index: rows.length, values: projected });
    });
    /** @type {Record<string, string|undefined>} */
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
    return {
      columns: entry.columns,
      collapsed: entry.collapsed === true,
      rows,
    };
  }

  /**
   * Render a validated JSONL table as self-contained static HTML.
   * @param {{source: string, columns: string[], collapsed?: boolean}} entry Table descriptor.
   * @param {{dataRoot?: string}} options Source directory override.
   * @returns {string} Self-contained table HTML.
   */
  function renderStaticJsonlTable(entry, options = {}) {
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

  return { parseStaticJsonlTable, renderStaticJsonlTable, validateDefinition };
}
