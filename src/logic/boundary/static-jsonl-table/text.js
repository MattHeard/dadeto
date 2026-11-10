import { captureEvidenceResult } from '../local/evidence-result.js';

/**
 * Retain native String coercion and its failures before trusted HTML escaping.
 * @param {unknown} value Raw rendered slot.
 * @returns {{ok: true, evidence: string} | {ok: false, error: unknown}} Accepted string or original coercion failure.
 */
export function parseStaticJsonlText(value) {
  return captureEvidenceResult(() => String(value));
}
