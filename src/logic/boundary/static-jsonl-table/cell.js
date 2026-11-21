import { captureEvidenceResult } from '../local/evidence-result.js';

/**
 * Interpret an own scalar cell without changing key lookup or native failures.
 * @param {unknown} record Raw record previously accepted by the line parser.
 * @param {string} column Authored column key.
 * @param {number} lineIndex Zero-based physical line number.
 * @returns {{ok: true, evidence: string | number} | {ok: false, error: unknown}} Accepted finite number/string or original failure.
 */
export function parseStaticJsonlCell(record, column, lineIndex) {
  return captureEvidenceResult(() => {
    if (!Object.prototype.hasOwnProperty.call(record, column))
      throw new TypeError(
        `Invalid static JSONL table: line ${lineIndex + 1} is missing column ${column}`
      );
    const cell = /** @type {Record<string, unknown>} */ (record)[column];
    if (
      (typeof cell !== 'number' && typeof cell !== 'string') ||
      (typeof cell === 'number' && !Number.isFinite(cell))
    )
      throw new TypeError(
        `Invalid static JSONL table: column ${column} contains an unsupported value on line ${lineIndex + 1}`
      );
    return cell;
  });
}
