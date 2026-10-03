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
  return createToyMessageBoundary(
    { valid: false },
    'error',
    indentation
  )(calculate);
}

/**
 * Bind a reusable message-only rejection policy for a family of calculations.
 * @param {Record<string, unknown>} rejection Caller-specific failure flags.
 * @param {string} messageKey Field holding the original thrown value's message.
 * @param {number} [indentation] Rejection indentation; omitted means readable JSON.
 * @returns {(calculate: () => string) => string} Boundary retaining success or caller-shaped failure without message coercion.
 */
export function createToyMessageBoundary(rejection, messageKey, indentation) {
  return calculate =>
    runToyFailureBoundary(calculate, error =>
      formatToyResult(
        {
          ...rejection,
          [messageKey]: /** @type {{message?: unknown}} */ (error).message,
        },
        indentation
      )
    );
}

/**
 * Retain a calculation result or delegate the original thrown value to its formatter.
 * @template T
 * @param {() => T} calculate Synchronous toy operation.
 * @param {(error: unknown) => T} reject Caller-owned failure presentation policy.
 * @returns {T} Success or formatted failure; formatter errors still escape.
 */
export function runToyFailureBoundary(calculate, reject) {
  try {
    return calculate();
  } catch (error) {
    return reject(error);
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
