import { captureEvidenceResult } from '../local/evidence-result.js';

/** @typedef {{kind: 'blank'} | {kind: 'record', record: Record<string, unknown>}} StaticJsonlLine */

/**
 * Interpret one raw source line without replacing native failures or their causes.
 * @param {unknown} line Raw line supplied by the source integration.
 * @param {number} lineIndex Zero-based physical line number.
 * @returns {{ok: true, evidence: StaticJsonlLine} | {ok: false, error: unknown}} Explicit blank, accepted record or original failure.
 */
export function parseStaticJsonlLine(line, lineIndex) {
  return captureEvidenceResult(() => interpretLine(line, lineIndex));
}

/**
 * Apply the existing blank-line and JSON-object policy in its original order.
 * @param {unknown} line Unparsed source line.
 * @param {number} lineIndex Zero-based physical line number.
 * @returns {StaticJsonlLine} Accepted interpretation; failures are captured outside.
 */
function interpretLine(line, lineIndex) {
  if (!(/** @type {string} */ (line).trim())) return { kind: 'blank' };
  const value = decodeLine(line, lineIndex);
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new TypeError(
      `Invalid static JSONL table: line ${lineIndex + 1} must contain a JSON object`
    );
  return {
    kind: 'record',
    record: /** @type {Record<string, unknown>} */ (value),
  };
}

/**
 * Decode raw JSON while retaining the original syntax failure as its cause.
 * @param {unknown} line Raw nonblank source line.
 * @param {number} lineIndex Zero-based physical line number.
 * @returns {unknown} Decoded JSON value before structural acceptance.
 */
function decodeLine(line, lineIndex) {
  try {
    return JSON.parse(/** @type {string} */ (line));
  } catch (error) {
    throw new Error(
      `Invalid static JSONL table: malformed JSON on line ${lineIndex + 1}`,
      { cause: error }
    );
  }
}
