/**
 * Format a toy validation failure using the common JSON error shape.
 * @param {unknown} message Original failure message, preserved without coercion.
 * @param {number} [indentation] JSON indentation; zero produces compact output.
 * @returns {string} Pretty-printed JSON error payload.
 */
export function formatToyError(message, indentation) {
  return formatToyResult({ valid: false, error: message }, indentation);
}

/**
 * Format a toy conversion failure without a validation flag.
 * @param {string} message Human-readable failure message.
 * @returns {string} Pretty-printed JSON error payload.
 */
export function formatToyConversionError(message) {
  return formatToyResult({ error: message });
}
/**
 * Serialize a structured toy result with consistent readable indentation.
 * @param {Record<string, unknown>} payload Toy result.
 * @param {number} [indentation] JSON indentation, defaulting to two spaces.
 * @returns {string} Pretty-printed JSON.
 */
export function formatToyResult(payload, indentation = 2) {
  return JSON.stringify(payload, null, indentation);
}

/**
 * Keep a calculation's success output and serialize its original failure message.
 * @param {() => string} calculate Synchronous toy calculation.
 * @param {number} [indentation] Failure indentation; omitted means readable JSON.
 * @returns {string} Original result or caller-formatted validation failure.
 */
export function runToyCalculation(calculate, indentation) {
  try {
    return calculate();
  } catch (error) {
    return formatToyError(
      /** @type {{message?: unknown}} */ (error).message,
      indentation
    );
  }
}

/**
 * Parse, calculate and serialize a request within the common toy error boundary.
 * @template T
 * @param {string} input Original serialized request.
 * @param {(input: string) => T} parse Caller-specific parsing and validation policy.
 * @param {(request: T) => Record<string, unknown>} calculate Structured domain calculation.
 * @returns {string} Readable result or the original validation failure message.
 */
export function runToyRequest(input, parse, calculate) {
  return runToyCalculation(() => formatToyResult(calculate(parse(input))));
}
