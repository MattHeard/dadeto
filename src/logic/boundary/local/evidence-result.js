/**
 * Capture a boundary interpretation without replacing its thrown value.
 * @template T
 * @param {() => T} interpret Pure interpretation of unparsed fields.
 * @returns {{ok: true, evidence: T} | {ok: false, error: unknown}} Explicit outcome.
 */
export function captureEvidenceResult(interpret) {
  try {
    return { ok: true, evidence: interpret() };
  } catch (error) {
    return { ok: false, error };
  }
}
