import { captureEvidenceResult } from '../local/evidence-result.js';

/**
 * Interpret descriptor acceptance without snapshotting mutable property getters.
 * @param {unknown} input Raw authored descriptor.
 * @returns {{ok: true, evidence: Record<string, unknown>} | {ok: false, error: unknown}} Original reference with opaque slots, or original failure.
 */
export function parseStaticJsonlDefinition(input) {
  return captureEvidenceResult(() => {
    if (!input || typeof input !== 'object') fail('entry must be an object');
    return interpretDefinition(/** @type {Record<string, unknown>} */ (input));
  });
}

/**
 * Apply ordered field/uniqueness acceptance while retaining raw read semantics.
 * @param {Record<string, unknown>} entry Original object with unparsed properties.
 * @returns {Record<string, unknown>} Original reference; no stable-slot guarantee.
 */
function interpretDefinition(entry) {
  if (typeof entry.source !== 'string' || !entry.source.trim())
    fail('source must be a non-empty string');
  if (!Array.isArray(entry.columns) || entry.columns.length === 0)
    fail('columns must be a non-empty array');
  if (entry.columns.some(column => typeof column !== 'string' || !column))
    fail('columns must contain non-empty strings');
  if (new Set(entry.columns).size !== entry.columns.length)
    fail('columns must be unique');
  return entry;
}

/**
 * Interpret source confinement after the injected pure absolute-path decision.
 * The adapter supplies the original capability/receiver lookup as one operation.
 * @param {Record<string, unknown>} entry Accepted raw descriptor reference.
 * @param {() => unknown} isAbsolute Original pure path decision, preserving truthiness.
 * @returns {{ok: true, evidence: Record<string, unknown>} | {ok: false, error: unknown}} Original reference or original failure.
 */
export function parseStaticJsonlConfinement(entry, isAbsolute) {
  return captureEvidenceResult(() => {
    if (
      isAbsolute() ||
      /** @type {string} */ (entry.source).split(/[\\/]/).includes('..')
    )
      fail('source must stay inside the static data directory');
    return entry;
  });
}

/**
 * Retain the authored descriptor's existing validation error category/message.
 * @param {string} message Existing diagnostic.
 * @returns {never} Always throws.
 */
function fail(message) {
  throw new TypeError(`Invalid static JSONL table: ${message}`);
}
